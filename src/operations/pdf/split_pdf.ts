import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument } from 'pdf-lib';

import { assertExistingPathInWorkspace, assertWritablePathInWorkspace } from '../../security/workspace_path.js';

import {
  type CommittedConversionOutput,
  type OutputConflictDecision,
  type PreparedConversionOutput,
} from '../lifecycle/commit_conversion_outputs.js';
import type { ConversionRuntime } from '../lifecycle/conversion_runtime.js';
import type { LineOutputChannel } from '../external_tools/external_tool_ascii_scratch.js';
import { assertPreflightPassed, type ConfirmWarningsHandler } from '../input/input_preflight.js';
import { runStagedConversionBatch } from '../lifecycle/run_staged_conversion_batch.js';

export interface SplitPdfJob {
  sourcePath: string;
  workspacePath: string;
  outputPathForPage: (page: number) => string;
}

export interface SplitPdfPageGroupsJob {
  sourcePath: string;
  workspacePath: string;
  pageGroups?: number[][];
  outputPathForGroup?: (groupIndex: number, pages: readonly number[]) => string;
}

export interface SplitPdfOptions {
  jobs: SplitPdfJob[];
  runId?: string;
  signal?: AbortSignal;
  resolveOutputConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  outputChannel?: LineOutputChannel;
  onConfirmWarnings?: ConfirmWarningsHandler;
}

export interface SplitPdfByPageGroupsOptions {
  jobs: SplitPdfPageGroupsJob[];
  runId?: string;
  signal?: AbortSignal;
  resolveOutputConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  outputChannel?: LineOutputChannel;
  onConfirmWarnings?: ConfirmWarningsHandler;
}

export type SplitPdfOutput = CommittedConversionOutput;

export async function splitPdfAllPages(options: SplitPdfOptions): Promise<SplitPdfOutput[]> {
  options.signal?.throwIfAborted();
  validateJobs(options.jobs);
  await validateInputPaths(options.jobs);
  await assertPreflightPassed(
    options.jobs,
    options.outputChannel,
    options.signal,
    undefined,
    options.onConfirmWarnings,
  );
  options.signal?.throwIfAborted();

  const runId = options.runId ?? `${Date.now()}-${crypto.randomUUID()}`;
  const runtime: ConversionRuntime = {};
  if (options.signal !== undefined) {
    runtime.signal = options.signal;
  }
  if (options.resolveOutputConflicts !== undefined) {
    runtime.resolveConflicts = options.resolveOutputConflicts;
  }
  if (options.outputChannel !== undefined) {
    runtime.outputChannel = options.outputChannel;
  }

  return runStagedConversionBatch({
    jobs: options.jobs,
    operationName: 'split-pdf',
    runId,
    runtime,
    stage: (job, index, currentRunId, batchRuntime) =>
      splitPdf({ job, index, runId: currentRunId, signal: batchRuntime.signal }),
  });
}

export async function splitPdfByPageGroups(options: SplitPdfByPageGroupsOptions): Promise<SplitPdfOutput[]> {
  options.signal?.throwIfAborted();
  validatePageGroupJobs(options.jobs);
  await validatePageGroupInputPaths(options.jobs);
  await assertPreflightPassed(
    options.jobs,
    options.outputChannel,
    options.signal,
    undefined,
    options.onConfirmWarnings,
  );
  options.signal?.throwIfAborted();

  const runId = options.runId ?? `${Date.now()}-${crypto.randomUUID()}`;
  const runtime: ConversionRuntime = {};
  if (options.signal !== undefined) {
    runtime.signal = options.signal;
  }
  if (options.resolveOutputConflicts !== undefined) {
    runtime.resolveConflicts = options.resolveOutputConflicts;
  }
  if (options.outputChannel !== undefined) {
    runtime.outputChannel = options.outputChannel;
  }

  return runStagedConversionBatch({
    jobs: options.jobs,
    operationName: 'split-pdf',
    runId,
    runtime,
    stage: (job, index, currentRunId, batchRuntime) =>
      splitPdfPageGroups({ job, index, runId: currentRunId, signal: batchRuntime.signal }),
  });
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
  const workDirectory = path.join(job.workspacePath, '.latex-graphics-helper', 'split-pdf', runId, itemName);
  const pagesDirectory = path.join(workDirectory, 'pages');
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
      stagingRootPath: path.join(job.workspacePath, '.latex-graphics-helper', 'split-pdf', runId),
    });
  }

  return stagedPages;
}

async function splitPdfPageGroups(params: {
  job: SplitPdfPageGroupsJob;
  index: number;
  runId: string;
  signal: AbortSignal | undefined;
}): Promise<PreparedConversionOutput[]> {
  const { job, index, runId, signal } = params;
  const pageGroups = job.pageGroups;
  const outputPathForGroup = job.outputPathForGroup;

  if (!pageGroups || !outputPathForGroup) {
    throw new Error('Page groups and outputPathForGroup are required.');
  }

  signal?.throwIfAborted();

  const itemName = `${index + 1}-${safeName(path.basename(job.sourcePath, path.extname(job.sourcePath)))}`;
  const workDirectory = path.join(job.workspacePath, '.latex-graphics-helper', 'split-pdf', runId, itemName);
  const groupsDirectory = path.join(workDirectory, 'groups');
  const copiedSourcePath = path.join(workDirectory, path.basename(job.sourcePath));

  await assertExistingPathInWorkspace(job.sourcePath, job.workspacePath);
  await assertWritablePathInWorkspace(groupsDirectory, job.workspacePath);
  signal?.throwIfAborted();
  await mkdir(groupsDirectory, { recursive: true });
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

  validatePageGroups(pageGroups, pageCount, job.sourcePath);

  const stagedGroups: PreparedConversionOutput[] = [];

  for (const [groupIndex, pages] of pageGroups.entries()) {
    signal?.throwIfAborted();
    const groupDocument = await PDFDocument.create();
    const copiedPages = await groupDocument.copyPages(
      sourceDocument,
      pages.map((page) => page - 1),
    );

    if (copiedPages.length !== pages.length) {
      throw new Error(`Could not copy all pages for group ${groupIndex}: ${job.sourcePath}`);
    }

    for (const copiedPage of copiedPages) {
      groupDocument.addPage(copiedPage);
    }

    const stagedOutputPath = path.join(groupsDirectory, `${groupIndex + 1}.pdf`);
    await assertWritablePathInWorkspace(stagedOutputPath, job.workspacePath);
    signal?.throwIfAborted();
    await writeFile(stagedOutputPath, await groupDocument.save());
    signal?.throwIfAborted();

    stagedGroups.push({
      stagedOutputPath,
      outputPath: outputPathForGroup(groupIndex, pages),
      workspacePath: job.workspacePath,
      stagingRootPath: path.join(job.workspacePath, '.latex-graphics-helper', 'split-pdf', runId),
    });
  }

  return stagedGroups;
}

async function validateInputPaths(jobs: SplitPdfJob[]): Promise<void> {
  await Promise.all(
    jobs.flatMap((job) => [
      assertExistingPathInWorkspace(job.sourcePath, job.workspacePath),
      assertWritablePathInWorkspace(
        path.join(job.workspacePath, '.latex-graphics-helper', 'split-pdf'),
        job.workspacePath,
      ),
    ]),
  );
}

async function validatePageGroupInputPaths(jobs: SplitPdfPageGroupsJob[]): Promise<void> {
  await Promise.all(
    jobs.flatMap((job) => [
      assertExistingPathInWorkspace(job.sourcePath, job.workspacePath),
      assertWritablePathInWorkspace(
        path.join(job.workspacePath, '.latex-graphics-helper', 'split-pdf'),
        job.workspacePath,
      ),
    ]),
  );
}

function validateJobs(jobs: SplitPdfJob[]): void {
  if (jobs.length === 0) {
    throw new Error('No PDF files were selected.');
  }

  for (const job of jobs) {
    if (path.extname(job.sourcePath).toLowerCase() !== '.pdf') {
      throw new Error(`Only PDF files can be split: ${job.sourcePath}`);
    }
  }
}

function validatePageGroupJobs(jobs: SplitPdfPageGroupsJob[]): void {
  if (jobs.length === 0) {
    throw new Error('No PDF files were selected.');
  }

  for (const job of jobs) {
    if (path.extname(job.sourcePath).toLowerCase() !== '.pdf') {
      throw new Error(`Only PDF files can be split: ${job.sourcePath}`);
    }

    if (!job.pageGroups || job.pageGroups.length === 0) {
      throw new Error(`No page groups were supplied: ${job.sourcePath}`);
    }

    if (!job.outputPathForGroup) {
      throw new Error(`outputPathForGroup is required: ${job.sourcePath}`);
    }

    for (const pages of job.pageGroups) {
      if (!Array.isArray(pages) || pages.length === 0) {
        throw new Error(`Page groups cannot be empty: ${job.sourcePath}`);
      }
    }
  }
}

function validatePageGroups(pageGroups: number[][], pageCount: number, sourcePath: string): void {
  for (const [groupIndex, pages] of pageGroups.entries()) {
    for (const page of pages) {
      if (!Number.isInteger(page) || page < 1 || page > pageCount) {
        throw new Error(`Page ${page} in group ${groupIndex} is out of range for ${sourcePath}`);
      }
    }
  }
}

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_') || 'pdf';
}
