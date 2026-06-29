import { execFile } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import pLimit from "p-limit";
import { PDFDocument } from "pdf-lib";

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
const PDF_EXTENSION = ".pdf";
const execFileAsync = promisify(execFile);

export interface ConvertPdfToPngPageJob {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
  pageNumber: number;
}

export interface ConvertPdfToPngFilesOptions {
  jobs: ConvertPdfToPngPageJob[];
  pdftocairoPath: string;
  runId?: string;
  resolveOutputConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  signal?: AbortSignal;
}

export async function convertPdfToPngFiles(
  options: ConvertPdfToPngFilesOptions,
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
        stagePdfPageConversion(job, index, runId, options.pdftocairoPath, options.signal),
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

export async function readPdfPageCount(sourcePath: string): Promise<number> {
  const pdf = await PDFDocument.load(await readFile(sourcePath));

  return pdf.getPageCount();
}

async function stagePdfPageConversion(
  job: ConvertPdfToPngPageJob,
  index: number,
  runId: string,
  pdftocairoPath: string,
  signal?: AbortSignal,
): Promise<PreparedConversionOutput> {
  signal?.throwIfAborted();
  const stagedOutputPath = path.join(
    job.workspacePath,
    ".latex-graphics-helper",
    "convert-pdf-to-png",
    runId,
    `${index + 1}`,
    "result.png",
  );
  await assertWritablePathInWorkspace(stagedOutputPath, job.workspacePath);
  await mkdir(path.dirname(stagedOutputPath), { recursive: true });
  signal?.throwIfAborted();

  await execFileAsync(
    pdftocairoPath,
    [
      "-png",
      "-r",
      "72",
      "-f",
      job.pageNumber.toString(),
      "-l",
      job.pageNumber.toString(),
      "-singlefile",
      job.sourcePath,
      path.join(path.dirname(stagedOutputPath), path.basename(stagedOutputPath, ".png")),
    ],
    {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      signal,
    },
  );
  signal?.throwIfAborted();

  return {
    stagedOutputPath,
    outputPath: job.outputPath,
    workspacePath: job.workspacePath,
  };
}

async function validateJobPaths(jobs: ConvertPdfToPngPageJob[]): Promise<void> {
  const sourceWorkspaces = new Map<string, string>();
  const workspacePaths = new Set<string>();

  for (const job of jobs) {
    sourceWorkspaces.set(job.sourcePath, job.workspacePath);
    workspacePaths.add(job.workspacePath);
  }

  await Promise.all([
    ...[...sourceWorkspaces.entries()].map(([sourcePath, workspacePath]) =>
      assertExistingPathInWorkspace(sourcePath, workspacePath),
    ),
    ...[...workspacePaths].map((workspacePath) =>
      assertWritablePathInWorkspace(
        path.join(workspacePath, ".latex-graphics-helper", "convert-pdf-to-png"),
        workspacePath,
      ),
    ),
    ...jobs.map((job) => assertWritablePathInWorkspace(job.outputPath, job.workspacePath)),
  ]);
}

function validateJobs(jobs: ConvertPdfToPngPageJob[]): void {
  if (jobs.length === 0) {
    throw new Error("No PDF pages were selected.");
  }

  for (const job of jobs) {
    if (path.extname(job.sourcePath).toLowerCase() !== PDF_EXTENSION) {
      throw new Error(`Unsupported PNG conversion input: ${job.sourcePath}`);
    }
  }
}
