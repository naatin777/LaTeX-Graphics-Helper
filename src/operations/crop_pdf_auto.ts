import { execFile } from 'node:child_process';
import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { PDFDocument, type PDFPage } from 'pdf-lib';

import { assertExistingPathInWorkspace, assertWritablePathInWorkspace } from '../security/workspace_path.js';

import {
  type CommittedConversionOutput,
  type OutputConflictDecision,
  type PreparedConversionOutput,
} from './commit_conversion_outputs.js';
import type { ConversionRuntime } from './conversion_runtime.js';
import {
  createAsciiInputScratch,
  defaultWindowsScratchBaseCandidates,
  removeSuccessfulScratch,
  validateAsciiScratchInput,
  type AsciiScratch,
  type LineOutputChannel,
} from './external_tool_ascii_scratch.js';
import { assertPreflightPassed } from './input_preflight.js';
import { runStagedConversionBatch } from './run_staged_conversion_batch.js';

const execFileAsync = promisify(execFile);

export interface CropPdfJob {
  sourcePath: string;
  workspacePath: string;
  outputPath: string;
}

export interface GhostscriptResult {
  stdout: string;
  stderr: string;
}

export type RunGhostscript = (executable: string, args: string[], signal?: AbortSignal) => Promise<GhostscriptResult>;

export interface CropPdfOptions {
  jobs: CropPdfJob[];
  margin: number;
  ghostscriptPath: string;
  runId?: string;
  runGhostscript?: RunGhostscript;
  signal?: AbortSignal;
  outputChannel?: LineOutputChannel;
  resolveOutputConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  platform?: NodeJS.Platform;
  scratchBaseCandidates?: readonly string[];
}

interface Box {
  left: number;
  bottom: number;
  right: number;
  top: number;
}

export async function cropPdfFiles(options: CropPdfOptions): Promise<CommittedConversionOutput[]> {
  options.signal?.throwIfAborted();
  validateJobs(options.jobs);
  validateMargin(options.margin);
  await validateJobPaths(options.jobs);

  await assertPreflightPassed(options.jobs, options.outputChannel, options.signal);
  options.signal?.throwIfAborted();

  if (!options.resolveOutputConflicts) {
    await assertOutputsDoNotExist(options.jobs);
  }

  options.signal?.throwIfAborted();

  const runId = options.runId ?? `${Date.now()}-${crypto.randomUUID()}`;
  const runGhostscript = options.runGhostscript ?? executeGhostscript;
  const platform = options.platform ?? process.platform;
  const scratchBaseCandidates = options.scratchBaseCandidates ?? defaultWindowsScratchBaseCandidates();
  const runtime: ConversionRuntime = {};
  if (options.signal !== undefined) runtime.signal = options.signal;
  if (options.resolveOutputConflicts !== undefined) runtime.resolveConflicts = options.resolveOutputConflicts;
  if (options.outputChannel !== undefined) runtime.outputChannel = options.outputChannel;

  return runStagedConversionBatch({
    jobs: options.jobs,
    operationName: 'crop-pdf-auto',
    stagingOperationName: 'crop-pdf',
    runId,
    runtime,
    stage: (job, index, currentRunId, batchRuntime) =>
      convertPdf({
        job,
        index,
        margin: options.margin,
        ghostscriptPath: options.ghostscriptPath,
        runId: currentRunId,
        runGhostscript,
        platform,
        scratchBaseCandidates,
        signal: batchRuntime.signal,
        ...(batchRuntime.outputChannel !== undefined && { outputChannel: batchRuntime.outputChannel }),
      }),
  });
}

async function convertPdf(params: {
  job: CropPdfJob;
  index: number;
  margin: number;
  ghostscriptPath: string;
  runId: string;
  runGhostscript: RunGhostscript;
  platform: NodeJS.Platform;
  scratchBaseCandidates: readonly string[];
  signal: AbortSignal | undefined;
  outputChannel?: LineOutputChannel;
}): Promise<PreparedConversionOutput> {
  const {
    job,
    index,
    margin,
    ghostscriptPath,
    runId,
    runGhostscript,
    platform,
    scratchBaseCandidates,
    signal,
    outputChannel,
  } = params;
  signal?.throwIfAborted();
  const itemName = `${index + 1}-${safeName(path.basename(job.sourcePath, path.extname(job.sourcePath)))}`;
  const workDirectory = path.join(job.workspacePath, '.latex-graphics-helper', 'crop-pdf', runId, itemName);
  const copiedSourcePath = path.join(workDirectory, path.basename(job.sourcePath));
  const stagedOutputPath = path.join(workDirectory, 'result.pdf');

  await assertExistingPathInWorkspace(job.sourcePath, job.workspacePath);
  await assertWritablePathInWorkspace(workDirectory, job.workspacePath);
  signal?.throwIfAborted();
  await mkdir(workDirectory, { recursive: true });
  await assertWritablePathInWorkspace(copiedSourcePath, job.workspacePath);
  signal?.throwIfAborted();
  await copyFile(job.sourcePath, copiedSourcePath);

  let scratch: AsciiScratch | undefined;

  try {
    await assertExistingPathInWorkspace(copiedSourcePath, job.workspacePath);
    signal?.throwIfAborted();
    let ghostscriptInputPath = copiedSourcePath;

    if (platform === 'win32') {
      const scratchArgs: Parameters<typeof createAsciiInputScratch>[0] = {
        baseCandidates: scratchBaseCandidates,
        inputFileName: 'input.pdf',
      };
      if (signal !== undefined) scratchArgs.signal = signal;
      if (outputChannel !== undefined) scratchArgs.outputChannel = outputChannel;
      scratch = await createAsciiInputScratch(scratchArgs);
      signal?.throwIfAborted();
      await copyFile(copiedSourcePath, scratch.inputPath);
      signal?.throwIfAborted();
      await validateAsciiScratchInput(scratch);
      ghostscriptInputPath = scratch.inputPath;
      outputChannel?.appendLine(`[scratch] logical input: ${job.sourcePath}`);
      outputChannel?.appendLine(`[scratch] tool input: ${scratch.inputPath}`);
    }

    const boundingBoxes = await readBoundingBoxes(
      ghostscriptPath,
      ghostscriptInputPath,
      runGhostscript,
      signal,
      outputChannel,
    );
    signal?.throwIfAborted();
    const document = await PDFDocument.load(await readFile(copiedSourcePath));
    signal?.throwIfAborted();
    const pages = document.getPages();

    if (boundingBoxes.length !== pages.length || pages.length === 0) {
      throw new Error(`Could not determine all PDF page bounds: ${job.sourcePath}`);
    }

    for (const [pageIndex, page] of pages.entries()) {
      signal?.throwIfAborted();
      const boundingBox = boundingBoxes[pageIndex];

      if (!boundingBox) {
        throw new Error(`Missing page bounds for page ${pageIndex + 1}: ${job.sourcePath}`);
      }

      setPageBounds(page, boundingBox, margin);
    }

    await assertWritablePathInWorkspace(stagedOutputPath, job.workspacePath);
    signal?.throwIfAborted();
    await writeFile(stagedOutputPath, await document.save());
    signal?.throwIfAborted();

    if (scratch) {
      await removeSuccessfulScratch(scratch, outputChannel);
    }

    return {
      stagedOutputPath,
      outputPath: job.outputPath,
      workspacePath: job.workspacePath,
      stagingRootPath: path.join(job.workspacePath, '.latex-graphics-helper', 'crop-pdf', runId),
    };
  } catch (error) {
    if (scratch) {
      outputChannel?.appendLine(`[scratch] retained after failure: ${scratch.rootPath}`);
    }
    throw error;
  }
}

async function readBoundingBoxes(
  ghostscriptPath: string,
  sourcePath: string,
  runGhostscript: RunGhostscript,
  signal?: AbortSignal,
  outputChannel?: LineOutputChannel,
): Promise<Box[]> {
  try {
    const result = await runGhostscript(
      ghostscriptPath,
      ['-dSAFER', '-dBATCH', '-dNOPAUSE', '-sDEVICE=bbox', sourcePath],
      signal,
    );

    return parseBoundingBoxes(result.stderr);
  } catch (error) {
    if (outputChannel) {
      const message = error instanceof Error ? error.message : String(error);
      outputChannel.appendLine(`Ghostscript error: ${message}`);
      outputChannel.appendLine(`Command: ${ghostscriptPath}`);
    }
    throw error;
  }
}

function setPageBounds(page: PDFPage, boundingBox: Box, margin: number): void {
  if (isEmptyBox(boundingBox)) {
    const mediaBox = page.getMediaBox();
    page.setCropBox(mediaBox.x, mediaBox.y, mediaBox.width, mediaBox.height);
    return;
  }

  const cropBox = addMargin(boundingBox, margin);
  const width = cropBox.right - cropBox.left;
  const height = cropBox.top - cropBox.bottom;

  page.setMediaBox(cropBox.left, cropBox.bottom, width, height);
  page.setCropBox(cropBox.left, cropBox.bottom, width, height);
}

async function validateJobPaths(jobs: CropPdfJob[]): Promise<void> {
  await Promise.all(
    jobs.flatMap((job) => [
      assertExistingPathInWorkspace(job.sourcePath, job.workspacePath),
      assertWritablePathInWorkspace(job.outputPath, job.workspacePath),
      assertWritablePathInWorkspace(
        path.join(job.workspacePath, '.latex-graphics-helper', 'crop-pdf'),
        job.workspacePath,
      ),
    ]),
  );
}

function validateJobs(jobs: CropPdfJob[]): void {
  if (jobs.length === 0) {
    throw new Error('No PDF files were selected.');
  }

  for (const job of jobs) {
    if (path.extname(job.sourcePath).toLowerCase() !== '.pdf') {
      throw new Error(`Only PDF files can be cropped: ${job.sourcePath}`);
    }
  }
}

function validateMargin(margin: number): void {
  if (!Number.isFinite(margin) || margin < 0) {
    throw new Error(`Crop margin must be a non-negative number: ${margin}`);
  }
}

async function assertOutputsDoNotExist(jobs: CropPdfJob[]): Promise<void> {
  const normalizedOutputs = new Set<string>();

  for (const job of jobs) {
    const normalizedOutput = path.resolve(job.outputPath);

    if (normalizedOutputs.has(normalizedOutput)) {
      throw new Error(`Multiple inputs resolve to the same output: ${job.outputPath}`);
    }
    normalizedOutputs.add(normalizedOutput);

    try {
      await access(job.outputPath);
      throw new Error(`Output file already exists: ${job.outputPath}`);
    } catch (error) {
      if (isFileNotFoundError(error)) {
        continue;
      }
      throw error;
    }
  }
}

export function parseBoundingBoxes(output: string): Box[] {
  const pattern =
    /^%%HiResBoundingBox:\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/gm;

  return [...output.matchAll(pattern)].map((match) => ({
    left: Number(match[1]),
    bottom: Number(match[2]),
    right: Number(match[3]),
    top: Number(match[4]),
  }));
}

function addMargin(box: Box, margin: number): Box {
  return {
    left: box.left - margin,
    bottom: box.bottom - margin,
    right: box.right + margin,
    top: box.top + margin,
  };
}

function isEmptyBox(box: Box): boolean {
  return box.left === box.right || box.bottom === box.top;
}

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_') || 'pdf';
}

function isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

async function executeGhostscript(
  executable: string,
  args: string[],
  signal?: AbortSignal,
): Promise<GhostscriptResult> {
  const result = await execFileAsync(executable, args, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    signal,
  });

  return {
    stdout: result.stdout,
    stderr: result.stderr,
  };
}
