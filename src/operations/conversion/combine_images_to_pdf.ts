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
import { writeSourceAsPdf, type WriteSourceAsPdfOptions } from './convert_to_pdf.js';
import { DEFAULT_MAX_INPUT_PIXELS } from '../../config/raster_input.js';
import type { ConversionRuntime } from '../lifecycle/conversion_runtime.js';
import { assertPreflightPassed, preflightOptionsFromRuntime } from '../input/input_preflight.js';
import { destroyRasterInput, openRasterInput } from './raster_input.js';
import {
  type RsvgToolScratchOptions,
  type RunRsvgConvert,
} from '../external_tools/run_rsvg_convert_with_ascii_scratch.js';
import type { SvgToPdfTools } from './tools/index.js';

export interface CombineImagesJob {
  sourcePath: string;
}

export interface CombineImagesToPdfOptions {
  jobs: CombineImagesJob[];
  outputPath: string;
  workspacePath: string;
  runtime?: ConversionRuntime;
  maxInputPixels?: number;
  runId?: string;
  svgToPdfTools?: SvgToPdfTools;
  rsvgConvertPath?: string;
  runRsvgConvert?: RunRsvgConvert;
  ghostscriptPath?: string;
  platform?: NodeJS.Platform;
  scratchBaseCandidates?: readonly string[];
}

export async function combineImagesToPdf(options: CombineImagesToPdfOptions): Promise<CommittedConversionOutput[]> {
  const { runtime } = options;
  const configuredMaxInputPixels = options.maxInputPixels ?? DEFAULT_MAX_INPUT_PIXELS;
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

  await assertPreflightPassed(options.jobs, {
    ...preflightOptionsFromRuntime(runtime),
    maxInputPixels: configuredMaxInputPixels,
  });
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
      const pageCount = await sourcePageCount(job.sourcePath, configuredMaxInputPixels);
      for (let page = 1; page <= pageCount; page += 1) {
        runtime?.signal?.throwIfAborted();
        const pdfPath = path.join(stagingRootPath, `page-${index + 1}-${page}.pdf`);
        const writeOptions: WriteSourceAsPdfOptions = {
          sourcePath: job.sourcePath,
          outputPath: pdfPath,
          workspacePath: options.workspacePath,
          maxInputPixels: configuredMaxInputPixels,
          svgToPdfTools: svgToPdfOptions(options),
          scratchOptions: scratchOptions(options),
          ...(pageCount > 1 ? { page } : {}),
        };
        if (runtime?.signal !== undefined) {
          writeOptions.signal = runtime.signal;
        }
        if (options.ghostscriptPath !== undefined) {
          writeOptions.ghostscriptPath = options.ghostscriptPath;
        }
        await writeSourceAsPdf(writeOptions);
        pdfPaths.push(pdfPath);
      }
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

async function sourcePageCount(sourcePath: string, maxInputPixels: number): Promise<number> {
  if (!isRasterImagePath(sourcePath)) {
    return 1;
  }

  const image = openRasterInput(sourcePath, maxInputPixels, undefined, true);
  try {
    const metadata = await image.metadata();
    return Math.max(1, metadata.pages ?? 1);
  } finally {
    await destroyRasterInput(image);
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

function svgToPdfOptions(options: CombineImagesToPdfOptions): SvgToPdfTools {
  if (options.svgToPdfTools !== undefined) {
    if (options.runRsvgConvert === undefined) {
      return options.svgToPdfTools;
    }

    return { ...options.svgToPdfTools, runRsvgConvert: options.runRsvgConvert };
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
