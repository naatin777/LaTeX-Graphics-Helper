import { mkdir } from "node:fs/promises";
import path from "node:path";

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

const CONVERSION_CONCURRENCY = 2;
const MERMAID_EXTENSIONS = [".mmd", ".mermaid"] as const;

export interface ConvertMermaidToSvgJob {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
}

export interface ConvertMermaidToSvgFilesOptions {
  jobs: ConvertMermaidToSvgJob[];
  puppeteer: MermaidPuppeteerOptions;
  runId?: string;
  resolveOutputConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  signal?: AbortSignal;
}

export interface MermaidPuppeteerOptions {
  browserChannel: string;
  executablePath?: string;
}

export async function convertMermaidToSvgFiles(
  options: ConvertMermaidToSvgFilesOptions,
): Promise<CommittedConversionOutput[]> {
  options.signal?.throwIfAborted();
  validateJobs(options.jobs);
  await validateJobPaths(options.jobs);
  options.signal?.throwIfAborted();

  const runId = options.runId ?? `${Date.now()}-${crypto.randomUUID()}`;
  const limit = pLimit(CONVERSION_CONCURRENCY);
  const stagedOutputs = await Promise.all(
    options.jobs.map((job, index) =>
      limit(() => stageMermaidConversion(job, index, runId, options.puppeteer, options.signal)),
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

function validateJobs(jobs: ConvertMermaidToSvgJob[]): void {
  if (jobs.length === 0) {
    throw new Error("No Mermaid files were selected.");
  }

  for (const job of jobs) {
    const extension = path.extname(job.sourcePath).toLowerCase();

    if (!MERMAID_EXTENSIONS.includes(extension as (typeof MERMAID_EXTENSIONS)[number])) {
      throw new Error(`Unsupported input for SVG conversion: ${job.sourcePath}`);
    }
  }
}

async function validateJobPaths(jobs: ConvertMermaidToSvgJob[]): Promise<void> {
  await Promise.all(
    jobs.map(async (job) => {
      await assertExistingPathInWorkspace(job.sourcePath, job.workspacePath);
      await assertWritablePathInWorkspace(job.outputPath, job.workspacePath);
    }),
  );
}

async function stageMermaidConversion(
  job: ConvertMermaidToSvgJob,
  index: number,
  runId: string,
  puppeteer: MermaidPuppeteerOptions,
  signal?: AbortSignal,
): Promise<PreparedConversionOutput> {
  signal?.throwIfAborted();
  const stagedOutputPath = path.join(
    job.workspacePath,
    ".latex-graphics-helper",
    "convert-mermaid-to-svg",
    runId,
    `${index + 1}`,
    "result.svg",
  );

  await writeMermaidAsSvg(job.sourcePath, stagedOutputPath, job.workspacePath, puppeteer, signal);
  signal?.throwIfAborted();

  return {
    stagedOutputPath,
    outputPath: job.outputPath,
    workspacePath: job.workspacePath,
  };
}

async function writeMermaidAsSvg(
  sourcePath: string,
  outputPath: string,
  workspacePath: string,
  puppeteer: MermaidPuppeteerOptions,
  signal?: AbortSignal,
): Promise<void> {
  signal?.throwIfAborted();
  await assertWritablePathInWorkspace(outputPath, workspacePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  signal?.throwIfAborted();

  try {
    await runMermaidCli(sourcePath, asSvgOutputPath(outputPath), {
      outputFormat: "svg",
      puppeteerConfig: createPuppeteerConfig(puppeteer),
      quiet: true,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new Error(`Mermaid CLI failed: ${errorMessage(error)}`, { cause: error });
  }
}

function asSvgOutputPath(outputPath: string): `${string}.svg` {
  if (!outputPath.toLowerCase().endsWith(".svg")) {
    throw new Error(`Mermaid SVG output path must end with .svg: ${outputPath}`);
  }

  return outputPath as `${string}.svg`;
}

function createPuppeteerConfig(options: MermaidPuppeteerOptions): Record<string, unknown> {
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
