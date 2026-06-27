import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import pLimit from "p-limit";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

import {
  assertExistingPathInWorkspace,
  assertWritablePathInWorkspace,
} from "../security/workspace_path.js";
import {
  commitConversionOutputs,
  type CommittedConversionOutput,
  type OutputConflictDecision,
  type PreparedConversionOutput,
} from "./commit_conversion_outputs.js";

const CONVERSION_CONCURRENCY = 2;
const DEFAULT_SUPPORTED_IMAGE_EXTENSIONS = [".png"] as const;

export interface ConvertPngToPdfOptions {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
  signal?: AbortSignal;
}

export interface ConvertPngToPdfJob {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
}

export interface ConvertPngToPdfFilesOptions {
  jobs: ConvertPngToPdfJob[];
  runId?: string;
  resolveOutputConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  signal?: AbortSignal;
  supportedExtensions?: readonly string[];
}

export async function convertPngToPdf(options: ConvertPngToPdfOptions): Promise<void> {
  const { sourcePath, outputPath, workspacePath, signal } = options;

  signal?.throwIfAborted();
  await assertExistingPathInWorkspace(sourcePath, workspacePath);
  await assertWritablePathInWorkspace(outputPath, workspacePath);
  await assertOutputDoesNotExist(outputPath);
  signal?.throwIfAborted();

  await writePngAsPdf(sourcePath, outputPath, workspacePath, signal);
}

export async function convertPngToPdfFiles(
  options: ConvertPngToPdfFilesOptions,
): Promise<CommittedConversionOutput[]> {
  options.signal?.throwIfAborted();
  validateJobs(options.jobs, options.supportedExtensions ?? DEFAULT_SUPPORTED_IMAGE_EXTENSIONS);
  await validateJobPaths(options.jobs);
  options.signal?.throwIfAborted();

  const runId = options.runId ?? `${Date.now()}-${crypto.randomUUID()}`;
  const limit = pLimit(CONVERSION_CONCURRENCY);
  const stagedOutputs = await Promise.all(
    options.jobs.map((job, index) =>
      limit(() => stagePngConversion(job, index, runId, options.signal)),
    ),
  );

  options.signal?.throwIfAborted();
  return commitConversionOutputs(stagedOutputs, {
    ...(options.signal !== undefined && { signal: options.signal }),
    ...(options.resolveOutputConflicts !== undefined && {
      resolveConflicts: options.resolveOutputConflicts,
    }),
  });
}

async function stagePngConversion(
  job: ConvertPngToPdfJob,
  index: number,
  runId: string,
  signal?: AbortSignal,
): Promise<PreparedConversionOutput> {
  signal?.throwIfAborted();
  const stagedOutputPath = path.join(
    job.workspacePath,
    ".latex-graphics-helper",
    "convert-png-to-pdf",
    runId,
    `${index + 1}`,
    "result.pdf",
  );

  await writePngAsPdf(job.sourcePath, stagedOutputPath, job.workspacePath, signal);
  signal?.throwIfAborted();

  return {
    stagedOutputPath,
    outputPath: job.outputPath,
    workspacePath: job.workspacePath,
  };
}

async function writePngAsPdf(
  sourcePath: string,
  outputPath: string,
  workspacePath: string,
  signal?: AbortSignal,
): Promise<void> {
  signal?.throwIfAborted();
  const metadata = await sharp(sourcePath).metadata();
  signal?.throwIfAborted();
  const { width, height } = metadata;

  if (!width || !height) {
    throw new Error(`Could not determine image dimensions: ${sourcePath}`);
  }

  const imageBuffer = await sharp(sourcePath).png().toBuffer();
  signal?.throwIfAborted();
  const pdfDocument = await PDFDocument.create();
  const page = pdfDocument.addPage([width, height]);
  const embeddedImage = await pdfDocument.embedPng(imageBuffer);
  page.drawImage(embeddedImage, {
    x: 0,
    y: 0,
    width,
    height,
  });

  const pdfBytes = await pdfDocument.save();
  signal?.throwIfAborted();
  await assertWritablePathInWorkspace(outputPath, workspacePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  signal?.throwIfAborted();
  await writeFile(outputPath, pdfBytes);
}

async function validateJobPaths(jobs: ConvertPngToPdfJob[]): Promise<void> {
  await Promise.all(
    jobs.flatMap((job) => [
      assertExistingPathInWorkspace(job.sourcePath, job.workspacePath),
      assertWritablePathInWorkspace(job.outputPath, job.workspacePath),
      assertWritablePathInWorkspace(
        path.join(job.workspacePath, ".latex-graphics-helper", "convert-png-to-pdf"),
        job.workspacePath,
      ),
    ]),
  );
}

function validateJobs(jobs: ConvertPngToPdfJob[], supportedExtensions: readonly string[]): void {
  if (jobs.length === 0) {
    throw new Error("No image files were selected.");
  }

  const supportedExtensionSet = new Set(
    supportedExtensions.map((extension) => extension.toLowerCase()),
  );

  for (const job of jobs) {
    if (!supportedExtensionSet.has(path.extname(job.sourcePath).toLowerCase())) {
      throw new Error(`Unsupported image format: ${job.sourcePath}`);
    }
  }
}

async function assertOutputDoesNotExist(outputPath: string): Promise<void> {
  try {
    await access(outputPath);
    throw new Error(`Output file already exists: ${outputPath}`);
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return;
    }
    throw error;
  }
}

function isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
