import { constants } from "node:fs";
import { access, copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import pLimit from "p-limit";
import { PDFDocument } from "pdf-lib";

import {
  assertExistingPathInWorkspace,
  assertWritablePathInWorkspace,
} from "../security/workspace_path.js";

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
}

export interface SplitPdfOutput {
  outputPath: string;
  workspacePath: string;
}

interface StagedPage extends SplitPdfOutput {
  stagedOutputPath: string;
}

export async function splitPdfAllPages(options: SplitPdfOptions): Promise<SplitPdfOutput[]> {
  options.signal?.throwIfAborted();
  validateJobs(options.jobs);
  await validateInputPaths(options.jobs);
  options.signal?.throwIfAborted();

  const runId = options.runId ?? `${Date.now()}-${crypto.randomUUID()}`;
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
  await validateOutputs(stagedPages);
  options.signal?.throwIfAborted();
  await commitOutputs(stagedPages, options.signal);

  return stagedPages.map(({ outputPath, workspacePath }) => ({
    outputPath,
    workspacePath,
  }));
}

async function splitPdf(params: {
  job: SplitPdfJob;
  index: number;
  runId: string;
  signal: AbortSignal | undefined;
}): Promise<StagedPage[]> {
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

  const stagedPages: StagedPage[] = [];

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

async function validateOutputs(stagedPages: StagedPage[]): Promise<void> {
  const normalizedOutputs = new Set<string>();

  for (const page of stagedPages) {
    const normalizedOutput = path.resolve(page.outputPath);

    if (normalizedOutputs.has(normalizedOutput)) {
      throw new Error(`Multiple pages resolve to the same output: ${page.outputPath}`);
    }
    normalizedOutputs.add(normalizedOutput);

    await assertExistingPathInWorkspace(page.stagedOutputPath, page.workspacePath);
    await assertWritablePathInWorkspace(page.outputPath, page.workspacePath);

    try {
      await access(page.outputPath);
      throw new Error(`Output file already exists: ${page.outputPath}`);
    } catch (error) {
      if (isFileNotFoundError(error)) {
        continue;
      }
      throw error;
    }
  }
}

async function commitOutputs(stagedPages: StagedPage[], signal?: AbortSignal): Promise<void> {
  const committedPages: StagedPage[] = [];

  try {
    for (const page of stagedPages) {
      signal?.throwIfAborted();
      await assertExistingPathInWorkspace(page.stagedOutputPath, page.workspacePath);
      await assertWritablePathInWorkspace(page.outputPath, page.workspacePath);
      await mkdir(path.dirname(page.outputPath), { recursive: true });
      signal?.throwIfAborted();
      await assertWritablePathInWorkspace(page.outputPath, page.workspacePath);
      await copyFile(page.stagedOutputPath, page.outputPath, constants.COPYFILE_EXCL);
      committedPages.push(page);
      signal?.throwIfAborted();
    }
  } catch (error) {
    await Promise.allSettled(
      committedPages.map(async (page) => {
        await assertExistingPathInWorkspace(page.outputPath, page.workspacePath);
        await rm(page.outputPath, { force: true });
      }),
    );
    throw error;
  }
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

function isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
