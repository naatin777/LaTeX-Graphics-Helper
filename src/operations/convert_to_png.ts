import { execFile } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { run as runMermaidCli } from "@mermaid-js/mermaid-cli";
import pLimit from "p-limit";
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
import type { MermaidPuppeteerOptions, RunDrawio } from "./convert_png_to_pdf.js";
import {
  runPdftocairoWithAsciiScratch,
  type PdfToolScratchOptions,
} from "./run_pdftocairo_with_ascii_scratch.js";

const CONVERSION_CONCURRENCY = 2;
const MERMAID_EXTENSIONS = [".mmd", ".mermaid"] as const;
const RASTER_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".webp", ".avif"] as const;
const EDITABLE_DRAWIO_IMAGE_EXTENSIONS = [
  ".drawio.png",
  ".dio.png",
  ".drawio.svg",
  ".dio.svg",
] as const;
const execFileAsync = promisify(execFile);

export interface ConvertToPngJob {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
  page?: number;
}

export interface DrawioToPngOptions {
  drawioPath: string;
  runDrawio?: RunDrawio;
}

export type RunPdfToPng = (
  sourcePath: string,
  outputPath: string,
  page: number,
  signal?: AbortSignal,
) => Promise<void>;

export interface ConvertToPngFilesOptions extends PdfToolScratchOptions {
  jobs: ConvertToPngJob[];
  pdftocairoPath: string;
  mermaid: MermaidPuppeteerOptions;
  drawio: DrawioToPngOptions;
  runPdfToPng?: RunPdfToPng;
  runId?: string;
  resolveOutputConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  signal?: AbortSignal;
}

export async function convertToPngFiles(
  options: ConvertToPngFilesOptions,
): Promise<CommittedConversionOutput[]> {
  options.signal?.throwIfAborted();
  validateJobs(options.jobs);
  await validateJobPaths(options.jobs);
  options.signal?.throwIfAborted();

  const runId = options.runId ?? `${Date.now()}-${crypto.randomUUID()}`;
  const limit = pLimit(CONVERSION_CONCURRENCY);
  const stagedOutputs = await Promise.all(
    options.jobs.map((job, index) =>
      limit(() =>
        stagePngConversion(
          job,
          index,
          runId,
          options.pdftocairoPath,
          options.mermaid,
          options.drawio,
          options.runPdfToPng,
          options,
          options.signal,
        ),
      ),
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
  job: ConvertToPngJob,
  index: number,
  runId: string,
  pdftocairoPath: string,
  mermaid: MermaidPuppeteerOptions,
  drawio: DrawioToPngOptions,
  runPdfToPng: RunPdfToPng | undefined,
  scratchOptions: PdfToolScratchOptions,
  signal?: AbortSignal,
): Promise<PreparedConversionOutput> {
  signal?.throwIfAborted();
  const stageDirectory = path.join(
    job.workspacePath,
    ".latex-graphics-helper",
    "convert-to-png",
    runId,
    `${index + 1}`,
  );
  const stagedOutputPath = path.join(stageDirectory, "result.png");

  await writeSourceAsPng(
    job,
    stagedOutputPath,
    stageDirectory,
    pdftocairoPath,
    mermaid,
    drawio,
    runPdfToPng,
    scratchOptions,
    signal,
  );
  signal?.throwIfAborted();

  return {
    stagedOutputPath,
    outputPath: job.outputPath,
    workspacePath: job.workspacePath,
  };
}

async function writeSourceAsPng(
  job: ConvertToPngJob,
  outputPath: string,
  stageDirectory: string,
  pdftocairoPath: string,
  mermaid: MermaidPuppeteerOptions,
  drawio: DrawioToPngOptions,
  runPdfToPng: RunPdfToPng | undefined,
  scratchOptions: PdfToolScratchOptions,
  signal?: AbortSignal,
): Promise<void> {
  const extension = path.extname(job.sourcePath).toLowerCase();

  if (isEditableDrawioImagePath(job.sourcePath)) {
    await writeDrawioAsPng(
      job,
      outputPath,
      stageDirectory,
      pdftocairoPath,
      drawio,
      runPdfToPng,
      scratchOptions,
      signal,
    );
    return;
  }

  if (extension === ".pdf") {
    await writePdfPageAsPng(
      job.sourcePath,
      outputPath,
      job.workspacePath,
      pdftocairoPath,
      job.page,
      runPdfToPng,
      scratchOptions,
      signal,
    );
    return;
  }

  if (MERMAID_EXTENSIONS.includes(extension as (typeof MERMAID_EXTENSIONS)[number])) {
    await writeMermaidAsPng(job.sourcePath, outputPath, job.workspacePath, mermaid, signal);
    return;
  }

  await writeImageAsPng(job.sourcePath, outputPath, job.workspacePath, signal);
}

async function writeDrawioAsPng(
  job: ConvertToPngJob,
  outputPath: string,
  stageDirectory: string,
  pdftocairoPath: string,
  drawio: DrawioToPngOptions,
  runPdfToPng: RunPdfToPng | undefined,
  scratchOptions: PdfToolScratchOptions,
  signal?: AbortSignal,
): Promise<void> {
  signal?.throwIfAborted();
  const pdfPath = path.join(stageDirectory, "drawio.pdf");
  await assertWritablePathInWorkspace(pdfPath, job.workspacePath);
  await mkdir(path.dirname(pdfPath), { recursive: true });
  signal?.throwIfAborted();

  await (drawio.runDrawio ?? executeDrawio)(
    drawio.drawioPath,
    ["-x", "-f", "pdf", "-o", pdfPath, job.sourcePath],
    signal,
  );
  await writePdfPageAsPng(
    pdfPath,
    outputPath,
    job.workspacePath,
    pdftocairoPath,
    job.page ?? 1,
    runPdfToPng,
    scratchOptions,
    signal,
  );
}

async function writePdfPageAsPng(
  sourcePath: string,
  outputPath: string,
  workspacePath: string,
  pdftocairoPath: string,
  page = 1,
  runPdfToPng?: RunPdfToPng,
  scratchOptions: PdfToolScratchOptions = {},
  signal?: AbortSignal,
): Promise<void> {
  signal?.throwIfAborted();
  await assertWritablePathInWorkspace(outputPath, workspacePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  signal?.throwIfAborted();

  await runPdftocairoWithAsciiScratch({
    sourcePath,
    outputPath,
    scratchOutputFileName: "output.png",
    scratch: scratchOptions,
    ...(signal !== undefined && { signal }),
    run: async (toolSourcePath, toolOutputPath) => {
      if (runPdfToPng) {
        await runPdfToPng(toolSourcePath, toolOutputPath, page, signal);
        return;
      }

      const outputPrefix = toolOutputPath.slice(0, -path.extname(toolOutputPath).length);
      await execFileAsync(
        pdftocairoPath,
        [
          "-png",
          "-singlefile",
          "-f",
          String(page),
          "-l",
          String(page),
          toolSourcePath,
          outputPrefix,
        ],
        {
          encoding: "utf8",
          maxBuffer: 10 * 1024 * 1024,
          signal,
        },
      );
    },
  });
}

async function writeMermaidAsPng(
  sourcePath: string,
  outputPath: string,
  workspacePath: string,
  mermaid: MermaidPuppeteerOptions,
  signal?: AbortSignal,
): Promise<void> {
  signal?.throwIfAborted();
  await assertWritablePathInWorkspace(outputPath, workspacePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  signal?.throwIfAborted();

  try {
    await runMermaidCli(sourcePath, asPngOutputPath(outputPath), {
      outputFormat: "png",
      puppeteerConfig: createMermaidPuppeteerConfig(mermaid),
      quiet: true,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new Error(`Mermaid CLI failed: ${errorMessage(error)}`, { cause: error });
  }
}

async function writeImageAsPng(
  sourcePath: string,
  outputPath: string,
  workspacePath: string,
  signal?: AbortSignal,
): Promise<void> {
  signal?.throwIfAborted();
  await assertWritablePathInWorkspace(outputPath, workspacePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  const sourceBuffer = await readFile(sourcePath);
  signal?.throwIfAborted();
  await sharp(sourceBuffer).png().toFile(outputPath);
}

async function executeDrawio(
  executable: string,
  args: string[],
  signal?: AbortSignal,
): Promise<void> {
  await execFileAsync(executable, args, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    signal,
  });
}

async function validateJobPaths(jobs: ConvertToPngJob[]): Promise<void> {
  await Promise.all(
    jobs.flatMap((job) => [
      assertExistingPathInWorkspace(job.sourcePath, job.workspacePath),
      assertWritablePathInWorkspace(job.outputPath, job.workspacePath),
      assertWritablePathInWorkspace(
        path.join(job.workspacePath, ".latex-graphics-helper", "convert-to-png"),
        job.workspacePath,
      ),
    ]),
  );
}

function validateJobs(jobs: ConvertToPngJob[]): void {
  if (jobs.length === 0) {
    throw new Error("No files were selected.");
  }

  for (const job of jobs) {
    if (!isSupportedSourcePath(job.sourcePath)) {
      throw new Error(`Unsupported input for PNG conversion: ${job.sourcePath}`);
    }
  }
}

function isSupportedSourcePath(sourcePath: string): boolean {
  const extension = path.extname(sourcePath).toLowerCase();

  return (
    extension === ".pdf" ||
    extension === ".svg" ||
    MERMAID_EXTENSIONS.includes(extension as (typeof MERMAID_EXTENSIONS)[number]) ||
    RASTER_IMAGE_EXTENSIONS.includes(extension as (typeof RASTER_IMAGE_EXTENSIONS)[number]) ||
    isEditableDrawioImagePath(sourcePath)
  );
}

function isEditableDrawioImagePath(sourcePath: string): boolean {
  const lowerSourcePath = sourcePath.toLowerCase();
  return EDITABLE_DRAWIO_IMAGE_EXTENSIONS.some((extension) => lowerSourcePath.endsWith(extension));
}

function asPngOutputPath(outputPath: string): `${string}.png` {
  if (!outputPath.toLowerCase().endsWith(".png")) {
    throw new Error(`PNG output path must end with .png: ${outputPath}`);
  }

  return outputPath as `${string}.png`;
}

function createMermaidPuppeteerConfig(options: MermaidPuppeteerOptions): Record<string, unknown> {
  if (options.executablePath) {
    return {
      executablePath: options.executablePath,
      headless: true,
    };
  }

  return {
    channel: options.browserChannel,
    headless: true,
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    const stderr = "stderr" in error && typeof error.stderr === "string" ? error.stderr.trim() : "";
    return stderr ? `${error.message}\n${stderr}` : error.message;
  }

  return String(error);
}
