import { execFile } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { run as runMermaidCli } from "@mermaid-js/mermaid-cli";
import sharp from "sharp";

import {
  assertExistingPathInWorkspace,
  assertWritablePathInWorkspace,
} from "../security/workspace_path.js";
import {
  isEditableDrawioImagePath,
  isMermaidPath,
  sourceFormatForPath,
} from "../application/source_format.js";
import {
  type CommittedConversionOutput,
  type OutputConflictDecision,
  type PreparedConversionOutput,
} from "./commit_conversion_outputs.js";
import type { MermaidPuppeteerOptions, RunDrawio } from "./convert_png_to_pdf.js";
import type { RunPdfToPng } from "./convert_to_png.js";
import {
  runPdftocairoWithAsciiScratch,
  type PdfToolScratchOptions,
} from "./run_pdftocairo_with_ascii_scratch.js";
import { runExternalTool } from "./run_external_tool.js";
import { runRasterConversionPipeline } from "./raster_conversion_pipeline.js";

const RASTER_IMAGE_EXTENSIONS = [".png", ".webp", ".avif"] as const;
const execFileAsync = promisify(execFile);

export interface ConvertToJpegJob {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
  page?: number;
}

export interface DrawioToJpegOptions {
  drawioPath: string;
  runDrawio?: RunDrawio;
}

export interface ConvertToJpegFilesOptions extends PdfToolScratchOptions {
  jobs: ConvertToJpegJob[];
  pdftocairoPath: string;
  mermaid: MermaidPuppeteerOptions;
  drawio: DrawioToJpegOptions;
  runPdfToPng?: RunPdfToPng;
  runId?: string;
  resolveOutputConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  signal?: AbortSignal;
}

export async function convertToJpegFiles(
  options: ConvertToJpegFilesOptions,
): Promise<CommittedConversionOutput[]> {
  options.signal?.throwIfAborted();
  validateJobs(options.jobs);
  await validateJobPaths(options.jobs);
  options.signal?.throwIfAborted();

  const runId = options.runId ?? `${Date.now()}-${crypto.randomUUID()}`;
  return runRasterConversionPipeline({
    jobs: options.jobs,
    operationName: "convert-to-jpeg",
    runId,
    ...(options.signal !== undefined && { signal: options.signal }),
    ...(options.resolveOutputConflicts !== undefined && {
      resolveOutputConflicts: options.resolveOutputConflicts,
    }),
    ...(options.outputChannel !== undefined && { outputChannel: options.outputChannel }),
    stage: (job, index, stageRunId, signal) =>
      stageJpegConversion(
        job,
        index,
        stageRunId,
        options.pdftocairoPath,
        options.mermaid,
        options.drawio,
        options.runPdfToPng,
        options,
        signal,
      ),
  });
}

async function stageJpegConversion(
  job: ConvertToJpegJob,
  index: number,
  runId: string,
  pdftocairoPath: string,
  mermaid: MermaidPuppeteerOptions,
  drawio: DrawioToJpegOptions,
  runPdfToPng: RunPdfToPng | undefined,
  scratchOptions: PdfToolScratchOptions,
  signal?: AbortSignal,
): Promise<PreparedConversionOutput> {
  signal?.throwIfAborted();
  const stageDirectory = path.join(
    job.workspacePath,
    ".latex-graphics-helper",
    "convert-to-jpeg",
    runId,
    `${index + 1}`,
  );
  const stagedOutputPath = path.join(stageDirectory, "result.jpeg");

  await writeSourceAsJpeg(
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
    stagingRootPath: path.join(
      job.workspacePath,
      ".latex-graphics-helper",
      "convert-to-jpeg",
      runId,
    ),
  };
}

async function writeSourceAsJpeg(
  job: ConvertToJpegJob,
  outputPath: string,
  stageDirectory: string,
  pdftocairoPath: string,
  mermaid: MermaidPuppeteerOptions,
  drawio: DrawioToJpegOptions,
  runPdfToPng: RunPdfToPng | undefined,
  scratchOptions: PdfToolScratchOptions,
  signal?: AbortSignal,
): Promise<void> {
  const extension = path.extname(job.sourcePath).toLowerCase();

  if (isEditableDrawioImagePath(job.sourcePath)) {
    await writeDrawioAsJpeg(
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
    await writePdfPageAsJpeg(
      job.sourcePath,
      outputPath,
      stageDirectory,
      job.workspacePath,
      pdftocairoPath,
      job.page,
      runPdfToPng,
      scratchOptions,
      signal,
    );
    return;
  }

  if (isMermaidPath(job.sourcePath)) {
    await writeMermaidAsJpeg(
      job.sourcePath,
      outputPath,
      stageDirectory,
      job.workspacePath,
      mermaid,
      signal,
    );
    return;
  }

  await writeImageAsJpeg(job.sourcePath, outputPath, job.workspacePath, signal);
}

async function writeDrawioAsJpeg(
  job: ConvertToJpegJob,
  outputPath: string,
  stageDirectory: string,
  pdftocairoPath: string,
  drawio: DrawioToJpegOptions,
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
  await writePdfPageAsJpeg(
    pdfPath,
    outputPath,
    stageDirectory,
    job.workspacePath,
    pdftocairoPath,
    job.page ?? 1,
    runPdfToPng,
    scratchOptions,
    signal,
  );
}

async function writePdfPageAsJpeg(
  sourcePath: string,
  outputPath: string,
  stageDirectory: string,
  workspacePath: string,
  pdftocairoPath: string,
  page = 1,
  runPdfToPng?: RunPdfToPng,
  scratchOptions: PdfToolScratchOptions = {},
  signal?: AbortSignal,
): Promise<void> {
  const pngPath = path.join(stageDirectory, "source.png");
  signal?.throwIfAborted();
  await assertWritablePathInWorkspace(pngPath, workspacePath);
  await mkdir(path.dirname(pngPath), { recursive: true });
  signal?.throwIfAborted();

  await runPdftocairoWithAsciiScratch({
    sourcePath,
    outputPath: pngPath,
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

  await writeImageAsJpeg(pngPath, outputPath, workspacePath, signal);
}

async function writeMermaidAsJpeg(
  sourcePath: string,
  outputPath: string,
  stageDirectory: string,
  workspacePath: string,
  mermaid: MermaidPuppeteerOptions,
  signal?: AbortSignal,
): Promise<void> {
  const pngPath = path.join(stageDirectory, "mermaid.png");
  signal?.throwIfAborted();
  await assertWritablePathInWorkspace(pngPath, workspacePath);
  await mkdir(path.dirname(pngPath), { recursive: true });
  signal?.throwIfAborted();

  try {
    await runMermaidCli(sourcePath, asPngOutputPath(pngPath), {
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

  await writeImageAsJpeg(pngPath, outputPath, workspacePath, signal);
}

async function writeImageAsJpeg(
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
  await sharp(sourceBuffer).jpeg().toFile(outputPath);
}

async function executeDrawio(
  executable: string,
  args: string[],
  signal?: AbortSignal,
): Promise<void> {
  await runExternalTool({
    toolName: "drawio",
    executable,
    args,
    ...(signal !== undefined && { signal }),
  });
}

async function validateJobPaths(jobs: ConvertToJpegJob[]): Promise<void> {
  await Promise.all(
    jobs.flatMap((job) => [
      assertExistingPathInWorkspace(job.sourcePath, job.workspacePath),
      assertWritablePathInWorkspace(job.outputPath, job.workspacePath),
      assertWritablePathInWorkspace(
        path.join(job.workspacePath, ".latex-graphics-helper", "convert-to-jpeg"),
        job.workspacePath,
      ),
    ]),
  );
}

function validateJobs(jobs: ConvertToJpegJob[]): void {
  if (jobs.length === 0) {
    throw new Error("No files were selected.");
  }

  for (const job of jobs) {
    if (!isSupportedSourcePath(job.sourcePath)) {
      throw new Error(`Unsupported input for JPEG conversion: ${job.sourcePath}`);
    }
  }
}

function isSupportedSourcePath(sourcePath: string): boolean {
  const extension = path.extname(sourcePath).toLowerCase();

  return (
    extension === ".pdf" ||
    extension === ".svg" ||
    sourceFormatForPath(sourcePath) === "mermaid" ||
    RASTER_IMAGE_EXTENSIONS.includes(extension as (typeof RASTER_IMAGE_EXTENSIONS)[number]) ||
    isEditableDrawioImagePath(sourcePath)
  );
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
