import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { run as runMermaidCli } from "@mermaid-js/mermaid-cli";
import pLimit from "p-limit";

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

export type { MermaidPuppeteerOptions };

const CONVERSION_CONCURRENCY = 2;
const MERMAID_EXTENSIONS = [".mmd", ".mermaid"] as const;
const EDITABLE_DRAWIO_IMAGE_EXTENSIONS = [
  ".drawio.png",
  ".dio.png",
  ".drawio.svg",
  ".dio.svg",
] as const;
const execFileAsync = promisify(execFile);

export interface ConvertToSvgJob {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
  page?: number;
}

export interface DrawioToSvgOptions {
  drawioPath: string;
  runDrawio?: RunDrawio;
}

export type RunPdfToSvg = (
  sourcePath: string,
  outputPath: string,
  page: number,
  signal?: AbortSignal,
) => Promise<void>;

export interface ConvertToSvgFilesOptions extends PdfToolScratchOptions {
  jobs: ConvertToSvgJob[];
  pdftocairoPath: string;
  mermaid: MermaidPuppeteerOptions;
  drawio: DrawioToSvgOptions;
  runPdfToSvg?: RunPdfToSvg;
  runId?: string;
  resolveOutputConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  signal?: AbortSignal;
}

export async function convertToSvgFiles(
  options: ConvertToSvgFilesOptions,
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
        stageSvgConversion(
          job,
          index,
          runId,
          options.pdftocairoPath,
          options.mermaid,
          options.drawio,
          options.runPdfToSvg,
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

async function stageSvgConversion(
  job: ConvertToSvgJob,
  index: number,
  runId: string,
  pdftocairoPath: string,
  mermaid: MermaidPuppeteerOptions,
  drawio: DrawioToSvgOptions,
  runPdfToSvg: RunPdfToSvg | undefined,
  scratchOptions: PdfToolScratchOptions,
  signal?: AbortSignal,
): Promise<PreparedConversionOutput> {
  signal?.throwIfAborted();
  const stageDirectory = path.join(
    job.workspacePath,
    ".latex-graphics-helper",
    "convert-to-svg",
    runId,
    `${index + 1}`,
  );
  const stagedOutputPath = path.join(stageDirectory, "result.svg");

  await writeSourceAsSvg(
    job,
    stagedOutputPath,
    pdftocairoPath,
    mermaid,
    drawio,
    runPdfToSvg,
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

async function writeSourceAsSvg(
  job: ConvertToSvgJob,
  outputPath: string,
  pdftocairoPath: string,
  mermaid: MermaidPuppeteerOptions,
  drawio: DrawioToSvgOptions,
  runPdfToSvg: RunPdfToSvg | undefined,
  scratchOptions: PdfToolScratchOptions,
  signal?: AbortSignal,
): Promise<void> {
  const extension = path.extname(job.sourcePath).toLowerCase();

  if (isEditableDrawioImagePath(job.sourcePath)) {
    await writeDrawioAsSvg(job.sourcePath, outputPath, job.workspacePath, drawio, signal);
    return;
  }

  if (extension === ".pdf") {
    await writePdfPageAsSvg(
      job.sourcePath,
      outputPath,
      job.workspacePath,
      pdftocairoPath,
      job.page,
      runPdfToSvg,
      scratchOptions,
      signal,
    );
    return;
  }

  await writeMermaidAsSvg(job.sourcePath, outputPath, job.workspacePath, mermaid, signal);
}

async function writeDrawioAsSvg(
  sourcePath: string,
  outputPath: string,
  workspacePath: string,
  drawio: DrawioToSvgOptions,
  signal?: AbortSignal,
): Promise<void> {
  signal?.throwIfAborted();
  await assertWritablePathInWorkspace(outputPath, workspacePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  signal?.throwIfAborted();

  try {
    await (drawio.runDrawio ?? executeDrawio)(
      drawio.drawioPath,
      ["-x", "-f", "svg", "-o", outputPath, sourcePath],
      signal,
    );
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new Error(`Draw.io CLI failed: ${errorMessage(error)}`, { cause: error });
  }
}

async function writePdfPageAsSvg(
  sourcePath: string,
  outputPath: string,
  workspacePath: string,
  pdftocairoPath: string,
  page = 1,
  runPdfToSvg?: RunPdfToSvg,
  scratchOptions: PdfToolScratchOptions = {},
  signal?: AbortSignal,
): Promise<void> {
  signal?.throwIfAborted();
  await assertWritablePathInWorkspace(outputPath, workspacePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  signal?.throwIfAborted();

  try {
    await runPdftocairoWithAsciiScratch({
      sourcePath,
      outputPath,
      scratchOutputFileName: "output.svg",
      scratch: scratchOptions,
      ...(signal !== undefined && { signal }),
      run: async (toolSourcePath, toolOutputPath) => {
        if (runPdfToSvg) {
          await runPdfToSvg(toolSourcePath, toolOutputPath, page, signal);
          return;
        }

        await execFileAsync(
          pdftocairoPath,
          ["-svg", "-f", String(page), "-l", String(page), toolSourcePath, toolOutputPath],
          {
            encoding: "utf8",
            maxBuffer: 10 * 1024 * 1024,
            signal,
          },
        );
      },
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new Error(`pdftocairo failed: ${errorMessage(error)}`, { cause: error });
  }
}

async function writeMermaidAsSvg(
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
    await runMermaidCli(sourcePath, asSvgOutputPath(outputPath), {
      outputFormat: "svg",
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

async function validateJobPaths(jobs: ConvertToSvgJob[]): Promise<void> {
  await Promise.all(
    jobs.flatMap((job) => [
      assertExistingPathInWorkspace(job.sourcePath, job.workspacePath),
      assertWritablePathInWorkspace(job.outputPath, job.workspacePath),
      assertWritablePathInWorkspace(
        path.join(job.workspacePath, ".latex-graphics-helper", "convert-to-svg"),
        job.workspacePath,
      ),
    ]),
  );
}

function validateJobs(jobs: ConvertToSvgJob[]): void {
  if (jobs.length === 0) {
    throw new Error("No files were selected.");
  }

  for (const job of jobs) {
    if (!isSupportedSourcePath(job.sourcePath)) {
      throw new Error(`Unsupported input for SVG conversion: ${job.sourcePath}`);
    }
  }
}

function isSupportedSourcePath(sourcePath: string): boolean {
  const extension = path.extname(sourcePath).toLowerCase();

  return (
    extension === ".pdf" ||
    MERMAID_EXTENSIONS.includes(extension as (typeof MERMAID_EXTENSIONS)[number]) ||
    isEditableDrawioImagePath(sourcePath)
  );
}

function isEditableDrawioImagePath(sourcePath: string): boolean {
  const lowerSourcePath = sourcePath.toLowerCase();
  return EDITABLE_DRAWIO_IMAGE_EXTENSIONS.some((extension) => lowerSourcePath.endsWith(extension));
}

function asSvgOutputPath(outputPath: string): `${string}.svg` {
  if (!outputPath.toLowerCase().endsWith(".svg")) {
    throw new Error(`SVG output path must end with .svg: ${outputPath}`);
  }

  return outputPath as `${string}.svg`;
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
