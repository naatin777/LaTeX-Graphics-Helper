import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import pLimit from "p-limit";
import { PDFDocument } from "pdf-lib";

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
import type { LineOutputChannel } from "./external_tool_ascii_scratch.js";

const SPLIT_CONCURRENCY = 2;

export interface SplitPdfJob {
  sourcePath: string;
  workspacePath: string;
  outputPathForPage: (page: number) => string;
}

export interface SplitPdfOptions {
  jobs: SplitPdfJob[];
  runId?: string;
  signal?: AbortSignal;
  resolveOutputConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  outputChannel?: LineOutputChannel;
}

export type SplitPdfOutput = CommittedConversionOutput;

export async function splitPdfAllPages(options: SplitPdfOptions): Promise<SplitPdfOutput[]> {
  options.signal?.throwIfAborted();
  validateJobs(options.jobs);
  await validateInputPaths(options.jobs);
  options.signal?.throwIfAborted();

  const runId = options.runId ?? `${Date.now()}-${crypto.randomUUID()}`;
  const artifacts = stagingArtifactsForJobs(options.jobs, "split-pdf", runId);

  return withStagingCleanup(
    artifacts,
    async () => {
      const limit = pLimit(SPLIT_CONCURRENCY);
      const stagedByJob = await Promise.all(
        options.jobs.map((job, index) =>
          limit(() => {
            options.signal?.throwIfAborted();
            return splitPdf({ job, index, runId, signal: options.signal });
          }),
        ),
      );
      const stagedPages = stagedByJob.flat();

      options.signal?.throwIfAborted();
      return commitConversionOutputs(stagedPages, {
        ...(options.signal !== undefined && { signal: options.signal }),
        ...(options.resolveOutputConflicts !== undefined && {
          resolveConflicts: options.resolveOutputConflicts,
        }),
        operationName: "split-pdf",
        ...(options.outputChannel !== undefined && { outputChannel: options.outputChannel }),
      });
    },
    options.outputChannel,
  );
}

async function splitPdf(params: {
  job: SplitPdfJob;
  index: number;
  runId: string;
  signal: AbortSignal | undefined;
}): Promise<PreparedConversionOutput[]> {
  const { job, index, runId, signal } = params;
  signal?.throwIfAborted();

  const itemName = `${index + 1}-${safeName(path.basename(job.sourcePath, path.extname(job.sourcePath)))}`;
  const workDirectory = path.join(
    job.workspacePath,
    ".latex-graphics-helper",
    "split-pdf",
    runId,
    itemName,
  );
  const pagesDirectory = path.join(workDirectory, "pages");
  const copiedSourcePath = path.join(workDirectory, path.basename(job.sourcePath));

  await assertExistingPathInWorkspace(job.sourcePath, job.workspacePath);
  await assertWritablePathInWorkspace(pagesDirectory, job.workspacePath);
  signal?.throwIfAborted();
  await mkdir(pagesDirectory, { recursive: true });
  await assertWritablePathInWorkspace(copiedSourcePath, job.workspacePath);
  signal?.throwIfAborted();
  await copyFile(job.sourcePath, copiedSourcePath);

  await assertExistingPathInWorkspace(copiedSourcePath, job.workspacePath);
  signal?.throwIfAborted();
  const sourceDocument = await PDFDocument.load(await readFile(copiedSourcePath));
  signal?.throwIfAborted();
  const pageCount = sourceDocument.getPageCount();

  if (pageCount === 0) {
    throw new Error(`PDF has no pages: ${job.sourcePath}`);
  }

  const stagedPages: PreparedConversionOutput[] = [];

  for (let page = 1; page <= pageCount; page++) {
    signal?.throwIfAborted();
    const pageDocument = await PDFDocument.create();
    const [copiedPage] = await pageDocument.copyPages(sourceDocument, [page - 1]);

    if (!copiedPage) {
      throw new Error(`Could not copy page ${page}: ${job.sourcePath}`);
    }

    pageDocument.addPage(copiedPage);
    const stagedOutputPath = path.join(pagesDirectory, `${page}.pdf`);
    await assertWritablePathInWorkspace(stagedOutputPath, job.workspacePath);
    signal?.throwIfAborted();
    await writeFile(stagedOutputPath, await pageDocument.save());
    signal?.throwIfAborted();

    stagedPages.push({
      stagedOutputPath,
      outputPath: job.outputPathForPage(page),
      workspacePath: job.workspacePath,
      stagingRootPath: path.join(job.workspacePath, ".latex-graphics-helper", "split-pdf", runId),
    });
  }

  return stagedPages;
}

async function validateInputPaths(jobs: SplitPdfJob[]): Promise<void> {
  await Promise.all(
    jobs.flatMap((job) => [
      assertExistingPathInWorkspace(job.sourcePath, job.workspacePath),
      assertWritablePathInWorkspace(
        path.join(job.workspacePath, ".latex-graphics-helper", "split-pdf"),
        job.workspacePath,
      ),
    ]),
  );
}

function validateJobs(jobs: SplitPdfJob[]): void {
  if (jobs.length === 0) {
    throw new Error("No PDF files were selected.");
  }

  for (const job of jobs) {
    if (path.extname(job.sourcePath).toLowerCase() !== ".pdf") {
      throw new Error(`Only PDF files can be split: ${job.sourcePath}`);
    }
  }
}

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_") || "pdf";
}
