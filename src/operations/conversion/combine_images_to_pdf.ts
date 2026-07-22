import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument } from 'pdf-lib';

import { isRasterImagePath, sourceFormatForPath } from '../../application/policy/source_format.js';
import { assertExistingPathInWorkspace, assertWritablePathInWorkspace } from '../../security/workspace_path.js';

import { cleanupConversionArtifacts, type ConversionArtifactRoot } from '../lifecycle/cleanup_conversion_artifacts.js';
import {
  commitConversionOutputs,
  type CommitConversionOutputsOptions,
  type CommittedConversionOutput,
} from '../lifecycle/commit_conversion_outputs.js';
import { writeSourceAsPdf, type SvgToPdfOptions, type WriteSourceAsPdfOptions } from './convert_to_pdf.js';
import type { ConversionRuntime } from '../lifecycle/conversion_runtime.js';
import { assertPreflightPassed, preflightOptionsFromRuntime } from '../input/input_preflight.js';
import {
  type RsvgToolScratchOptions,
  type RunRsvgConvert,
} from '../external_tools/run_rsvg_convert_with_ascii_scratch.js';

export interface CombineImagesJob {
  sourcePath: string;
}

export interface CombineImagesToPdfOptions {
  jobs: CombineImagesJob[];
  outputPath: string;
  workspacePath: string;
  runtime?: ConversionRuntime;
  runId?: string;
  svgToPdf?: SvgToPdfOptions;
  rsvgConvertPath?: string;
  runRsvgConvert?: RunRsvgConvert;
  ghostscriptPath?: string;
  platform?: NodeJS.Platform;
  scratchBaseCandidates?: readonly string[];
}

export async function combineImagesToPdf(options: CombineImagesToPdfOptions): Promise<CommittedConversionOutput[]> {
  const { runtime } = options;
  runtime?.signal?.throwIfAborted();
  validateJobs(options.jobs);

  await Promise.all([
    ...options.jobs.map((job) => assertExistingPathInWorkspace(job.sourcePath, options.workspacePath)),
    assertWritablePathInWorkspace(options.outputPath, options.workspacePath),
    assertWritablePathInWorkspace(
      path.join(options.workspacePath, '.latex-graphics-helper', 'combine-images'),
      options.workspacePath,
    ),
  ]);
  runtime?.signal?.throwIfAborted();

  await assertPreflightPassed(options.jobs, preflightOptionsFromRuntime(runtime));
  runtime?.signal?.throwIfAborted();

  const runId = options.runId ?? `${Date.now()}-${crypto.randomUUID()}`;
  const stagingRootPath = path.join(options.workspacePath, '.latex-graphics-helper', 'combine-images', runId);
  const artifacts: ConversionArtifactRoot[] = [{ rootPath: stagingRootPath, workspacePath: options.workspacePath }];

  try {
    await mkdir(stagingRootPath, { recursive: true });
    const pdfPaths: string[] = [];

    for (let index = 0; index < options.jobs.length; index += 1) {
      runtime?.signal?.throwIfAborted();
      const job = options.jobs[index]!;
      const pdfPath = path.join(stagingRootPath, `page-${index + 1}.pdf`);
      const writeOptions: WriteSourceAsPdfOptions = {
        sourcePath: job.sourcePath,
        outputPath: pdfPath,
        workspacePath: options.workspacePath,
        svgToPdf: svgToPdfOptions(options),
        scratchOptions: scratchOptions(options),
      };
      if (runtime?.signal !== undefined) {
        writeOptions.signal = runtime.signal;
      }
      if (options.ghostscriptPath !== undefined) {
        writeOptions.ghostscriptPath = options.ghostscriptPath;
      }
      await writeSourceAsPdf(writeOptions);
      pdfPaths.push(pdfPath);
      runtime?.reportProgress?.(index + 1, options.jobs.length);
    }

    const mergedDocument = await PDFDocument.create();

    for (const pdfPath of pdfPaths) {
      runtime?.signal?.throwIfAborted();
      const sourceDocument = await PDFDocument.load(await readFile(pdfPath));
      const pages = await mergedDocument.copyPages(sourceDocument, sourceDocument.getPageIndices());

      for (const page of pages) {
        mergedDocument.addPage(page);
      }
    }

    runtime?.signal?.throwIfAborted();
    const stagedOutputPath = path.join(stagingRootPath, 'result.pdf');
    await writeFile(stagedOutputPath, await mergedDocument.save());
    runtime?.signal?.throwIfAborted();

    const commitOptions: CommitConversionOutputsOptions = {
      operationName: 'combine-images-to-pdf',
    };
    if (runtime?.signal !== undefined) {
      commitOptions.signal = runtime.signal;
    }
    if (runtime?.resolveConflicts !== undefined) {
      commitOptions.resolveConflicts = runtime.resolveConflicts;
    }
    if (runtime?.outputChannel !== undefined) {
      commitOptions.outputChannel = runtime.outputChannel;
    }
    return commitConversionOutputs(
      [{ stagedOutputPath, outputPath: options.outputPath, workspacePath: options.workspacePath, stagingRootPath }],
      commitOptions,
    );
  } catch (error) {
    await cleanupConversionArtifacts(artifacts, runtime?.outputChannel, error);
    throw error instanceof Error ? error : new Error(String(error));
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
  if (options.platform !== undefined) {
    result.platform = options.platform;
  }
  if (options.scratchBaseCandidates !== undefined) {
    result.scratchBaseCandidates = options.scratchBaseCandidates;
  }
  if (options.runtime?.outputChannel !== undefined) {
    result.outputChannel = options.runtime.outputChannel;
  }
  return result;
}
