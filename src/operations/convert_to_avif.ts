import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
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
import { stagingArtifactsForJobs, withStagingCleanup } from "./cleanup_conversion_artifacts.js";
import {
  commitConversionOutputs,
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

const CONVERSION_CONCURRENCY = 2;
const MERMAID_EXTENSIONS = [".mmd", ".mermaid"] as const;
const RASTER_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"] as const;
const EDITABLE_DRAWIO_IMAGE_EXTENSIONS = [
  ".drawio.png",
  ".dio.png",
  ".drawio.svg",
  ".dio.svg",
] as const;
const execFileAsync = promisify(execFile);

export interface ConvertToAvifJob {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
  page?: number;
}

export interface DrawioToAvifOptions {
  drawioPath: string;
  runDrawio?: RunDrawio;
}

export interface AvifOutputOptions {
  effort: number;
}

export interface ConvertToAvifFilesOptions extends PdfToolScratchOptions {
  jobs: ConvertToAvifJob[];
  pdftocairoPath: string;
  mermaid: MermaidPuppeteerOptions;
  drawio: DrawioToAvifOptions;
  avif: AvifOutputOptions;
  runPdfToPng?: RunPdfToPng;
  runId?: string;
  resolveOutputConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  signal?: AbortSignal;
}

export async function convertToAvifFiles(
  options: ConvertToAvifFilesOptions,
): Promise<CommittedConversionOutput[]> {
  options.signal?.throwIfAborted();
  validateJobs(options.jobs);
  await validateJobPaths(options.jobs);
  options.signal?.throwIfAborted();

  const runId = options.runId ?? `${Date.now()}-${randomUUID()}`;
  const artifacts = stagingArtifactsForJobs(options.jobs, "convert-to-avif", runId);

  return withStagingCleanup(
    artifacts,
    async () => {
      const limit = pLimit(CONVERSION_CONCURRENCY);
      const stagedOutputs = await Promise.all(
        options.jobs.map((job, index) =>
          limit(() =>
            stageAvifConversion(
              job,
              index,
              runId,
              options.pdftocairoPath,
              options.mermaid,
              options.drawio,
              options.avif,
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
        operationName: "convert-to-avif",
        ...(options.outputChannel !== undefined && { outputChannel: options.outputChannel }),
      });
    },
    options.outputChannel,
  );
}

async function stageAvifConversion(
  job: ConvertToAvifJob,
  index: number,
  runId: string,
  pdftocairoPath: string,
  mermaid: MermaidPuppeteerOptions,
  drawio: DrawioToAvifOptions,
  avif: AvifOutputOptions,
  runPdfToPng: RunPdfToPng | undefined,
  scratchOptions: PdfToolScratchOptions,
  signal?: AbortSignal,
): Promise<PreparedConversionOutput> {
  signal?.throwIfAborted();
  const stageDirectory = path.join(
    job.workspacePath,
    ".latex-graphics-helper",
    "convert-to-avif",
    runId,
    `${index + 1}`,
  );
  const stagedOutputPath = path.join(stageDirectory, "result.avif");

  await writeSourceAsAvif(
    job,
    stagedOutputPath,
    stageDirectory,
    pdftocairoPath,
    mermaid,
    drawio,
    avif,
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
      "convert-to-avif",
      runId,
    ),
  };
}

async function writeSourceAsAvif(
  job: ConvertToAvifJob,
  outputPath: string,
  stageDirectory: string,
  pdftocairoPath: string,
  mermaid: MermaidPuppeteerOptions,
  drawio: DrawioToAvifOptions,
  avif: AvifOutputOptions,
  runPdfToPng: RunPdfToPng | undefined,
  scratchOptions: PdfToolScratchOptions,
  signal?: AbortSignal,
): Promise<void> {
  const extension = path.extname(job.sourcePath).toLowerCase();

  if (isEditableDrawioImagePath(job.sourcePath)) {
    await writeDrawioAsAvif(
      job,
      outputPath,
      stageDirectory,
      pdftocairoPath,
      drawio,
      avif,
      runPdfToPng,
      scratchOptions,
      signal,
    );
    return;
  }

  if (extension === ".pdf") {
    await writePdfPageAsAvif(
      job.sourcePath,
      outputPath,
      stageDirectory,
      job.workspacePath,
      pdftocairoPath,
      avif,
      job.page,
      runPdfToPng,
      scratchOptions,
      signal,
    );
    return;
  }

  if (MERMAID_EXTENSIONS.includes(extension as (typeof MERMAID_EXTENSIONS)[number])) {
    await writeMermaidAsAvif(
      job.sourcePath,
      outputPath,
      stageDirectory,
      job.workspacePath,
      mermaid,
      avif,
      signal,
    );
    return;
  }

  await writeImageAsAvif(job.sourcePath, outputPath, job.workspacePath, avif, signal);
}

async function writeDrawioAsAvif(
  job: ConvertToAvifJob,
  outputPath: string,
  stageDirectory: string,
  pdftocairoPath: string,
  drawio: DrawioToAvifOptions,
  avif: AvifOutputOptions,
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
  await writePdfPageAsAvif(
    pdfPath,
    outputPath,
    stageDirectory,
    job.workspacePath,
    pdftocairoPath,
    avif,
    job.page ?? 1,
    runPdfToPng,
    scratchOptions,
    signal,
  );
}

async function writePdfPageAsAvif(
  sourcePath: string,
  outputPath: string,
  stageDirectory: string,
  workspacePath: string,
  pdftocairoPath: string,
  avif: AvifOutputOptions,
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

  await writeImageAsAvif(pngPath, outputPath, workspacePath, avif, signal);
}

async function writeMermaidAsAvif(
  sourcePath: string,
  outputPath: string,
  stageDirectory: string,
  workspacePath: string,
  mermaid: MermaidPuppeteerOptions,
  avif: AvifOutputOptions,
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

  await writeImageAsAvif(pngPath, outputPath, workspacePath, avif, signal);
}

async function writeImageAsAvif(
  sourcePath: string,
  outputPath: string,
  workspacePath: string,
  avif: AvifOutputOptions,
  signal?: AbortSignal,
): Promise<void> {
  signal?.throwIfAborted();
  await assertWritablePathInWorkspace(outputPath, workspacePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  const sourceBuffer = await readFile(sourcePath);
  signal?.throwIfAborted();
  await sharp(sourceBuffer).avif({ effort: avif.effort }).toFile(outputPath);
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

async function validateJobPaths(jobs: ConvertToAvifJob[]): Promise<void> {
  await Promise.all(
    jobs.flatMap((job) => [
      assertExistingPathInWorkspace(job.sourcePath, job.workspacePath),
      assertWritablePathInWorkspace(job.outputPath, job.workspacePath),
      assertWritablePathInWorkspace(
        path.join(job.workspacePath, ".latex-graphics-helper", "convert-to-avif"),
        job.workspacePath,
      ),
    ]),
  );
}

function validateJobs(jobs: ConvertToAvifJob[]): void {
  if (jobs.length === 0) {
    throw new Error("No files were selected.");
  }

  for (const job of jobs) {
    if (!isSupportedSourcePath(job.sourcePath)) {
      throw new Error(`Unsupported input for AVIF conversion: ${job.sourcePath}`);
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
