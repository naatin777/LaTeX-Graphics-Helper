import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import pLimit from "p-limit";
import { PDFDocument, type PDFPage } from "pdf-lib";

import {
  assertExistingPathInWorkspace,
  assertWritablePathInWorkspace,
} from "../security/workspace_path.js";

const execFileAsync = promisify(execFile);
const CONVERSION_CONCURRENCY = 2;

export interface CropPdfJob {
  sourcePath: string;
  workspacePath: string;
  outputPath: string;
}

export interface GhostscriptResult {
  stdout: string;
  stderr: string;
}

export type RunGhostscript = (executable: string, args: string[]) => Promise<GhostscriptResult>;

export interface CropPdfOptions {
  jobs: CropPdfJob[];
  margin: number;
  ghostscriptPath: string;
  runId?: string;
  runGhostscript?: RunGhostscript;
}

interface Box {
  left: number;
  bottom: number;
  right: number;
  top: number;
}

interface ConvertedPdf {
  stagedOutputPath: string;
  outputPath: string;
  workspacePath: string;
}

export async function cropPdfFiles(options: CropPdfOptions): Promise<void> {
  validateJobs(options.jobs);
  validateMargin(options.margin);
  await validateJobPaths(options.jobs);
  await assertOutputsDoNotExist(options.jobs);

  const runId = options.runId ?? `${Date.now()}-${crypto.randomUUID()}`;
  const runGhostscript = options.runGhostscript ?? executeGhostscript;
  const limit = pLimit(CONVERSION_CONCURRENCY);
  const converted = await Promise.all(
    options.jobs.map((job, index) =>
      limit(() =>
        convertPdf({
          job,
          index,
          margin: options.margin,
          ghostscriptPath: options.ghostscriptPath,
          runId,
          runGhostscript,
        }),
      ),
    ),
  );

  await commitOutputs(converted);
}

async function convertPdf(params: {
  job: CropPdfJob;
  index: number;
  margin: number;
  ghostscriptPath: string;
  runId: string;
  runGhostscript: RunGhostscript;
}): Promise<ConvertedPdf> {
  const { job, index, margin, ghostscriptPath, runId, runGhostscript } = params;
  const itemName = `${index + 1}-${safeName(path.basename(job.sourcePath, path.extname(job.sourcePath)))}`;
  const workDirectory = path.join(
    job.workspacePath,
    ".latex-graphics-helper",
    "crop-pdf",
    runId,
    itemName,
  );
  const copiedSourcePath = path.join(workDirectory, path.basename(job.sourcePath));
  const stagedOutputPath = path.join(workDirectory, "result.pdf");

  await assertExistingPathInWorkspace(job.sourcePath, job.workspacePath);
  await assertWritablePathInWorkspace(workDirectory, job.workspacePath);
  await mkdir(workDirectory, { recursive: true });
  await assertWritablePathInWorkspace(copiedSourcePath, job.workspacePath);
  await copyFile(job.sourcePath, copiedSourcePath);

  await assertExistingPathInWorkspace(copiedSourcePath, job.workspacePath);
  const boundingBoxes = await readBoundingBoxes(ghostscriptPath, copiedSourcePath, runGhostscript);
  const document = await PDFDocument.load(await readFile(copiedSourcePath));
  const pages = document.getPages();

  if (boundingBoxes.length !== pages.length || pages.length === 0) {
    throw new Error(`Could not determine all PDF page bounds: ${job.sourcePath}`);
  }

  for (const [pageIndex, page] of pages.entries()) {
    const boundingBox = boundingBoxes[pageIndex];

    if (!boundingBox) {
      throw new Error(`Missing page bounds for page ${pageIndex + 1}: ${job.sourcePath}`);
    }

    setPageBounds(page, boundingBox, margin);
  }

  await assertWritablePathInWorkspace(stagedOutputPath, job.workspacePath);
  await writeFile(stagedOutputPath, await document.save());

  return {
    stagedOutputPath,
    outputPath: job.outputPath,
    workspacePath: job.workspacePath,
  };
}

async function readBoundingBoxes(
  ghostscriptPath: string,
  sourcePath: string,
  runGhostscript: RunGhostscript,
): Promise<Box[]> {
  const result = await runGhostscript(ghostscriptPath, [
    "-dSAFER",
    "-dBATCH",
    "-dNOPAUSE",
    "-sDEVICE=bbox",
    sourcePath,
  ]);

  return parseBoundingBoxes(result.stderr);
}

function setPageBounds(page: PDFPage, boundingBox: Box, margin: number): void {
  if (isEmptyBox(boundingBox)) {
    const mediaBox = page.getMediaBox();
    page.setCropBox(mediaBox.x, mediaBox.y, mediaBox.width, mediaBox.height);
    return;
  }

  const cropBox = addMargin(boundingBox, margin);
  const width = cropBox.right - cropBox.left;
  const height = cropBox.top - cropBox.bottom;

  page.setMediaBox(cropBox.left, cropBox.bottom, width, height);
  page.setCropBox(cropBox.left, cropBox.bottom, width, height);
}

async function validateJobPaths(jobs: CropPdfJob[]): Promise<void> {
  await Promise.all(
    jobs.flatMap((job) => [
      assertExistingPathInWorkspace(job.sourcePath, job.workspacePath),
      assertWritablePathInWorkspace(job.outputPath, job.workspacePath),
      assertWritablePathInWorkspace(
        path.join(job.workspacePath, ".latex-graphics-helper", "crop-pdf"),
        job.workspacePath,
      ),
    ]),
  );
}

async function commitOutputs(converted: ConvertedPdf[]): Promise<void> {
  const committedItems: ConvertedPdf[] = [];

  try {
    for (const item of converted) {
      await assertExistingPathInWorkspace(item.stagedOutputPath, item.workspacePath);
      await assertWritablePathInWorkspace(item.outputPath, item.workspacePath);
      await mkdir(path.dirname(item.outputPath), { recursive: true });
      await assertWritablePathInWorkspace(item.outputPath, item.workspacePath);
      await copyFile(item.stagedOutputPath, item.outputPath, constants.COPYFILE_EXCL);
      committedItems.push(item);
    }
  } catch (error) {
    await Promise.allSettled(
      committedItems.map(async (item) => {
        await assertExistingPathInWorkspace(item.outputPath, item.workspacePath);
        await rm(item.outputPath, { force: true });
      }),
    );
    throw error;
  }
}

async function assertOutputsDoNotExist(jobs: CropPdfJob[]): Promise<void> {
  const normalizedOutputs = new Set<string>();

  for (const job of jobs) {
    const normalizedOutput = path.resolve(job.outputPath);

    if (normalizedOutputs.has(normalizedOutput)) {
      throw new Error(`Multiple inputs resolve to the same output: ${job.outputPath}`);
    }
    normalizedOutputs.add(normalizedOutput);

    try {
      await access(job.outputPath);
      throw new Error(`Output file already exists: ${job.outputPath}`);
    } catch (error) {
      if (isFileNotFoundError(error)) {
        continue;
      }
      throw error;
    }
  }
}

function validateJobs(jobs: CropPdfJob[]): void {
  if (jobs.length === 0) {
    throw new Error("No PDF files were selected.");
  }

  for (const job of jobs) {
    if (path.extname(job.sourcePath).toLowerCase() !== ".pdf") {
      throw new Error(`Only PDF files can be cropped: ${job.sourcePath}`);
    }
  }
}

function validateMargin(margin: number): void {
  if (!Number.isFinite(margin) || margin < 0) {
    throw new Error(`Crop margin must be a non-negative number: ${margin}`);
  }
}

export function parseBoundingBoxes(output: string): Box[] {
  const pattern =
    /^%%HiResBoundingBox:\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/gm;

  return [...output.matchAll(pattern)].map((match) => ({
    left: Number(match[1]),
    bottom: Number(match[2]),
    right: Number(match[3]),
    top: Number(match[4]),
  }));
}

function addMargin(box: Box, margin: number): Box {
  return {
    left: box.left - margin,
    bottom: box.bottom - margin,
    right: box.right + margin,
    top: box.top + margin,
  };
}

function isEmptyBox(box: Box): boolean {
  return box.left === box.right || box.bottom === box.top;
}

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_") || "pdf";
}

function isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

async function executeGhostscript(executable: string, args: string[]): Promise<GhostscriptResult> {
  const result = await execFileAsync(executable, args, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });

  return {
    stdout: result.stdout,
    stderr: result.stderr,
  };
}
