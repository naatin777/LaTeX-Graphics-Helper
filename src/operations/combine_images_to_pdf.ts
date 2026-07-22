import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument } from 'pdf-lib';

import { isRasterImagePath, sourceFormatForPath } from '../application/source_format.js';
import { assertExistingPathInWorkspace, assertWritablePathInWorkspace } from '../security/workspace_path.js';

import { cleanupConversionArtifacts, type ConversionArtifactRoot } from './cleanup_conversion_artifacts.js';
import {
  commitConversionOutputs,
  type CommitConversionOutputsOptions,
  type CommittedConversionOutput,
  type OutputConflictDecision,
} from './commit_conversion_outputs.js';
import { writeImageAsPdf, type SvgToPdfOptions, type WriteImageAsPdfOptions } from './convert_png_to_pdf.js';
import type { ConversionRuntime } from './conversion_runtime.js';
import type { LineOutputChannel } from './external_tool_ascii_scratch.js';
import { assertPreflightPassed } from './input_preflight.js';
import { type RsvgToolScratchOptions, type RunRsvgConvert } from './run_rsvg_convert_with_ascii_scratch.js';

export interface CombineImagesJob {
  sourcePath: string;
}

export interface CombineImagesToPdfOptions {
  jobs: CombineImagesJob[];
  outputPath: string;
  workspacePath: string;
  runId?: string;
  signal?: AbortSignal;
  reportProgress?: ConversionRuntime['reportProgress'];
  svgToPdf?: SvgToPdfOptions;
  rsvgConvertPath?: string;
  runRsvgConvert?: RunRsvgConvert;
  ghostscriptPath?: string;
  platform?: NodeJS.Platform;
  scratchBaseCandidates?: readonly string[];
  resolveOutputConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  outputChannel?: LineOutputChannel;
}

export async function combineImagesToPdf(options: CombineImagesToPdfOptions): Promise<CommittedConversionOutput[]> {
  options.signal?.throwIfAborted();
  validateJobs(options.jobs);

  await Promise.all([
    ...options.jobs.map((job) => assertExistingPathInWorkspace(job.sourcePath, options.workspacePath)),
    assertWritablePathInWorkspace(options.outputPath, options.workspacePath),
    assertWritablePathInWorkspace(
      path.join(options.workspacePath, '.latex-graphics-helper', 'combine-images'),
      options.workspacePath,
    ),
  ]);
  options.signal?.throwIfAborted();

  await assertPreflightPassed(options.jobs, options.outputChannel, options.signal);
  options.signal?.throwIfAborted();

  const runId = options.runId ?? `${Date.now()}-${crypto.randomUUID()}`;
  const stagingRootPath = path.join(options.workspacePath, '.latex-graphics-helper', 'combine-images', runId);
  const artifacts: ConversionArtifactRoot[] = [{ rootPath: stagingRootPath, workspacePath: options.workspacePath }];

  try {
    await mkdir(stagingRootPath, { recursive: true });
    const pdfPaths: string[] = [];

    for (let index = 0; index < options.jobs.length; index += 1) {
      options.signal?.throwIfAborted();
      const job = options.jobs[index]!;
      const pdfPath = path.join(stagingRootPath, `page-${index + 1}.pdf`);
      const writeOptions: WriteImageAsPdfOptions = {
        sourcePath: job.sourcePath,
        outputPath: pdfPath,
        workspacePath: options.workspacePath,
        svgToPdf: svgToPdfOptions(options),
        scratchOptions: scratchOptions(options),
      };
      if (options.signal !== undefined) writeOptions.signal = options.signal;
      if (options.ghostscriptPath !== undefined) writeOptions.ghostscriptPath = options.ghostscriptPath;
      await writeImageAsPdf(writeOptions);
      pdfPaths.push(pdfPath);
      options.reportProgress?.(index + 1, options.jobs.length);
    }

    const mergedDocument = await PDFDocument.create();

    for (const pdfPath of pdfPaths) {
      options.signal?.throwIfAborted();
      const sourceDocument = await PDFDocument.load(await readFile(pdfPath));
      const pages = await mergedDocument.copyPages(sourceDocument, sourceDocument.getPageIndices());

      for (const page of pages) {
        mergedDocument.addPage(page);
      }
    }

    options.signal?.throwIfAborted();
    const stagedOutputPath = path.join(stagingRootPath, 'result.pdf');
    await writeFile(stagedOutputPath, await mergedDocument.save());
    options.signal?.throwIfAborted();

    const commitOptions: CommitConversionOutputsOptions = { operationName: 'combine-images-to-pdf' as const };
    if (options.signal !== undefined) commitOptions.signal = options.signal;
    if (options.resolveOutputConflicts !== undefined) commitOptions.resolveConflicts = options.resolveOutputConflicts;
    if (options.outputChannel !== undefined) commitOptions.outputChannel = options.outputChannel;
    return commitConversionOutputs(
      [{ stagedOutputPath, outputPath: options.outputPath, workspacePath: options.workspacePath, stagingRootPath }],
      commitOptions,
    );
  } catch (error) {
    await cleanupConversionArtifacts(artifacts, options.outputChannel, error);
    throw error;
  }
}

function validateJobs(jobs: CombineImagesJob[]): void {
  if (jobs.length === 0) {
    throw new Error('No images were selected.');
  }

  for (const job of jobs) {
    const format = sourceFormatForPath(job.sourcePath);
    if (!isRasterImagePath(job.sourcePath) && format !== 'svg' && format !== 'eps') {
      throw new Error(`Unsupported image input: ${job.sourcePath}`);
    }
  }
}

function svgToPdfOptions(options: CombineImagesToPdfOptions): SvgToPdfOptions {
  if (options.svgToPdf !== undefined) {
    if (options.runRsvgConvert === undefined) {
      return options.svgToPdf;
    }

    return { ...options.svgToPdf, runRsvgConvert: options.runRsvgConvert };
  }

  return {
    engine: 'rsvg-convert',
    rsvgConvertPath: options.rsvgConvertPath ?? 'rsvg-convert',
    puppeteerBrowser: 'chrome',
    puppeteerBrowserChannel: 'chrome',
    ...(options.runRsvgConvert !== undefined && { runRsvgConvert: options.runRsvgConvert }),
  };
}

function scratchOptions(options: CombineImagesToPdfOptions): RsvgToolScratchOptions {
  const result: RsvgToolScratchOptions = {};
  if (options.platform !== undefined) result.platform = options.platform;
  if (options.scratchBaseCandidates !== undefined) result.scratchBaseCandidates = options.scratchBaseCandidates;
  if (options.outputChannel !== undefined) result.outputChannel = options.outputChannel;
  return result;
}
