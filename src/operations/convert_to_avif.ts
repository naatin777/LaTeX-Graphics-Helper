import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
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
import type { ConversionRuntime } from "./conversion_runtime.js";
import { runStagedConversionBatch } from "./run_staged_conversion_batch.js";

const RASTER_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"] as const;
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

interface AvifStageTools {
  pdftocairoPath: string;
  mermaid: MermaidPuppeteerOptions;
  drawio: DrawioToAvifOptions;
  runPdfToPng?: RunPdfToPng;
}

interface AvifStageContext {
  runId: string;
  runtime: Pick<ConversionRuntime, "signal">;
  tools: AvifStageTools;
  scratch: PdfToolScratchOptions;
  output: AvifOutputOptions;
}

interface AvifStagePaths {
  stageDirectory: string;
  stagedOutputPath: string;
  stagingRootPath: string;
}

interface AvifRenderRequest {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
  stageDirectory?: string;
  page?: number;
}

export async function convertToAvifFiles(
  options: ConvertToAvifFilesOptions,
): Promise<CommittedConversionOutput[]> {
  options.signal?.throwIfAborted();
  validateJobs(options.jobs);
  await validateJobPaths(options.jobs);
  options.signal?.throwIfAborted();

  const runId = options.runId ?? `${Date.now()}-${randomUUID()}`;
  const runtime: ConversionRuntime = {
    ...(options.signal !== undefined && { signal: options.signal }),
    ...(options.resolveOutputConflicts !== undefined && {
      resolveConflicts: options.resolveOutputConflicts,
    }),
    ...(options.outputChannel !== undefined && { outputChannel: options.outputChannel }),
  };
  const tools: AvifStageTools = {
    pdftocairoPath: options.pdftocairoPath,
    mermaid: options.mermaid,
    drawio: options.drawio,
    ...(options.runPdfToPng !== undefined && { runPdfToPng: options.runPdfToPng }),
  };
  const scratch: PdfToolScratchOptions = {
    ...(options.platform !== undefined && { platform: options.platform }),
    ...(options.scratchBaseCandidates !== undefined && {
      scratchBaseCandidates: options.scratchBaseCandidates,
    }),
    ...(options.outputChannel !== undefined && { outputChannel: options.outputChannel }),
  };
  return runStagedConversionBatch({
    jobs: options.jobs,
    operationName: "convert-to-avif",
    runId,
    runtime,
    stage: (job, index, stageRunId, stageRuntime) =>
      stageAvifConversion(job, index, {
        runId: stageRunId,
        runtime: {
          ...(stageRuntime.signal !== undefined && { signal: stageRuntime.signal }),
        },
        tools,
        scratch,
        output: options.avif,
      }),
  });
}

async function stageAvifConversion(
  job: ConvertToAvifJob,
  index: number,
  context: AvifStageContext,
): Promise<PreparedConversionOutput> {
  context.runtime.signal?.throwIfAborted();
  const paths: AvifStagePaths = {
    stageDirectory: path.join(
      job.workspacePath,
      ".latex-graphics-helper",
      "convert-to-avif",
      context.runId,
      `${index + 1}`,
    ),
    stagedOutputPath: path.join(
      job.workspacePath,
      ".latex-graphics-helper",
      "convert-to-avif",
      context.runId,
      `${index + 1}`,
      "result.avif",
    ),
    stagingRootPath: path.join(
      job.workspacePath,
      ".latex-graphics-helper",
      "convert-to-avif",
      context.runId,
    ),
  };

  await writeSourceAsAvif(job, paths, context);
  context.runtime.signal?.throwIfAborted();

  return {
    stagedOutputPath: paths.stagedOutputPath,
    outputPath: job.outputPath,
    workspacePath: job.workspacePath,
    stagingRootPath: paths.stagingRootPath,
  };
}

async function writeSourceAsAvif(
  job: ConvertToAvifJob,
  paths: AvifStagePaths,
  context: AvifStageContext,
): Promise<void> {
  const extension = path.extname(job.sourcePath).toLowerCase();

  if (isEditableDrawioImagePath(job.sourcePath)) {
    await writeDrawioAsAvif(job, paths, context);
    return;
  }

  const request: AvifRenderRequest = {
    sourcePath: job.sourcePath,
    outputPath: paths.stagedOutputPath,
    workspacePath: job.workspacePath,
    stageDirectory: paths.stageDirectory,
    ...(job.page !== undefined && { page: job.page }),
  };

  if (extension === ".pdf") {
    await writePdfPageAsAvif(request, context);
    return;
  }

  if (isMermaidPath(job.sourcePath)) {
    await writeMermaidAsAvif(request, context);
    return;
  }

  await writeImageAsAvif(request, context);
}

async function writeDrawioAsAvif(
  job: ConvertToAvifJob,
  paths: AvifStagePaths,
  context: AvifStageContext,
): Promise<void> {
  context.runtime.signal?.throwIfAborted();
  const pdfPath = path.join(paths.stageDirectory, "drawio.pdf");
  await assertWritablePathInWorkspace(pdfPath, job.workspacePath);
  await mkdir(path.dirname(pdfPath), { recursive: true });
  context.runtime.signal?.throwIfAborted();

  await (context.tools.drawio.runDrawio ?? executeDrawio)(
    context.tools.drawio.drawioPath,
    ["-x", "-f", "pdf", "-o", pdfPath, job.sourcePath],
    context.runtime.signal,
  );
  await writePdfPageAsAvif(
    {
      sourcePath: pdfPath,
      outputPath: paths.stagedOutputPath,
      workspacePath: job.workspacePath,
      stageDirectory: paths.stageDirectory,
      page: job.page ?? 1,
    },
    context,
  );
}

async function writePdfPageAsAvif(
  request: AvifRenderRequest,
  context: AvifStageContext,
): Promise<void> {
  const pngPath = path.join(
    request.stageDirectory ?? path.dirname(request.outputPath),
    "source.png",
  );
  context.runtime.signal?.throwIfAborted();
  await assertWritablePathInWorkspace(pngPath, request.workspacePath);
  await mkdir(path.dirname(pngPath), { recursive: true });
  context.runtime.signal?.throwIfAborted();

  await runPdftocairoWithAsciiScratch({
    sourcePath: request.sourcePath,
    outputPath: pngPath,
    scratchOutputFileName: "output.png",
    scratch: context.scratch,
    ...(context.runtime.signal !== undefined && { signal: context.runtime.signal }),
    run: async (toolSourcePath, toolOutputPath) => {
      if (context.tools.runPdfToPng) {
        await context.tools.runPdfToPng(
          toolSourcePath,
          toolOutputPath,
          request.page ?? 1,
          context.runtime.signal,
        );
        return;
      }

      const outputPrefix = toolOutputPath.slice(0, -path.extname(toolOutputPath).length);
      await execFileAsync(
        context.tools.pdftocairoPath,
        [
          "-png",
          "-singlefile",
          "-f",
          String(request.page ?? 1),
          "-l",
          String(request.page ?? 1),
          toolSourcePath,
          outputPrefix,
        ],
        {
          encoding: "utf8",
          maxBuffer: 10 * 1024 * 1024,
          signal: context.runtime.signal,
        },
      );
    },
  });

  await writeImageAsAvif({ ...request, sourcePath: pngPath }, context);
}

async function writeMermaidAsAvif(
  request: AvifRenderRequest,
  context: AvifStageContext,
): Promise<void> {
  const pngPath = path.join(
    request.stageDirectory ?? path.dirname(request.outputPath),
    "mermaid.png",
  );
  context.runtime.signal?.throwIfAborted();
  await assertWritablePathInWorkspace(pngPath, request.workspacePath);
  await mkdir(path.dirname(pngPath), { recursive: true });
  context.runtime.signal?.throwIfAborted();

  try {
    await runMermaidCli(request.sourcePath, asPngOutputPath(pngPath), {
      outputFormat: "png",
      puppeteerConfig: createMermaidPuppeteerConfig(context.tools.mermaid),
      quiet: true,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new Error(`Mermaid CLI failed: ${errorMessage(error)}`, { cause: error });
  }

  await writeImageAsAvif({ ...request, sourcePath: pngPath }, context);
}

async function writeImageAsAvif(
  request: AvifRenderRequest,
  context: AvifStageContext,
): Promise<void> {
  context.runtime.signal?.throwIfAborted();
  await assertWritablePathInWorkspace(request.outputPath, request.workspacePath);
  await mkdir(path.dirname(request.outputPath), { recursive: true });
  const sourceBuffer = await readFile(request.sourcePath);
  context.runtime.signal?.throwIfAborted();
  await sharp(sourceBuffer).avif({ effort: context.output.effort }).toFile(request.outputPath);
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
