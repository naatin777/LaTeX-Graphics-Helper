import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

import { isRasterImagePath, sourceFormatForPath } from '../application/source_format.js';
import { assertExistingPathInWorkspace, assertWritablePathInWorkspace } from '../security/workspace_path.js';

import { cleanupConversionArtifacts, type ConversionArtifactRoot } from './cleanup_conversion_artifacts.js';
import {
  commitConversionOutputs,
  type CommittedConversionOutput,
  type OutputConflictDecision,
} from './commit_conversion_outputs.js';
import { convertEpsToPdf, type EpsToPdfOptions } from './eps_to_pdf.js';
import type { LineOutputChannel } from './external_tool_ascii_scratch.js';
import { assertPreflightPassed } from './input_preflight.js';
import { runExternalTool } from './run_external_tool.js';
import {
  runRsvgConvertWithAsciiScratch,
  type RsvgToolScratchOptions,
  type RunRsvgConvert,
} from './run_rsvg_convert_with_ascii_scratch.js';

export interface CombineImagesJob {
  sourcePath: string;
}

export interface CombineImagesToPdfOptions {
  jobs: CombineImagesJob[];
  outputPath: string;
  workspacePath: string;
  runId?: string;
  signal?: AbortSignal;
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

  await assertPreflightPassed(options.jobs, options.outputChannel);
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
      await convertToPdf(job.sourcePath, pdfPath, options);
      pdfPaths.push(pdfPath);
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

    return commitConversionOutputs(
      [{ stagedOutputPath, outputPath: options.outputPath, workspacePath: options.workspacePath, stagingRootPath }],
      {
        ...(options.signal !== undefined && { signal: options.signal }),
        ...(options.resolveOutputConflicts !== undefined && {
          resolveConflicts: options.resolveOutputConflicts,
        }),
        operationName: 'combine-images-to-pdf',
        ...(options.outputChannel !== undefined && { outputChannel: options.outputChannel }),
      },
    );
  } catch (error) {
    await cleanupConversionArtifacts(artifacts, options.outputChannel);
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

async function convertToPdf(sourcePath: string, outputPath: string, options: CombineImagesToPdfOptions): Promise<void> {
  const extension = path.extname(sourcePath).toLowerCase();

  if (extension === '.svg') {
    await writeSvgToPdf(sourcePath, outputPath, options);
    return;
  }

  if (extension === '.eps') {
    await writeEpsToPdf(sourcePath, outputPath, options);
    return;
  }

  await writeRasterToPdf(sourcePath, outputPath, options.workspacePath, options.signal);
}

async function writeRasterToPdf(
  sourcePath: string,
  outputPath: string,
  workspacePath: string,
  signal?: AbortSignal,
): Promise<void> {
  signal?.throwIfAborted();
  const sourceBuffer = await readFile(sourcePath);
  signal?.throwIfAborted();
  const metadata = await sharp(sourceBuffer).metadata();
  signal?.throwIfAborted();
  const { width, height } = metadata;

  if (!width || !height) {
    throw new Error(`Could not determine image dimensions: ${sourcePath}`);
  }

  const imageBuffer = await sharp(sourceBuffer).png().toBuffer();
  signal?.throwIfAborted();
  const pdfDocument = await PDFDocument.create();
  const page = pdfDocument.addPage([width, height]);
  const embeddedImage = await pdfDocument.embedPng(imageBuffer);
  page.drawImage(embeddedImage, { x: 0, y: 0, width, height });

  const pdfBytes = await pdfDocument.save();
  signal?.throwIfAborted();
  await assertWritablePathInWorkspace(outputPath, workspacePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  signal?.throwIfAborted();
  await writeFile(outputPath, pdfBytes);
}

async function writeSvgToPdf(
  sourcePath: string,
  outputPath: string,
  options: CombineImagesToPdfOptions,
): Promise<void> {
  if (!options.rsvgConvertPath) {
    throw new Error('rsvg-convert is required for SVG conversion.');
  }

  options.signal?.throwIfAborted();
  await assertWritablePathInWorkspace(outputPath, options.workspacePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  options.signal?.throwIfAborted();

  const scratch: RsvgToolScratchOptions = {
    ...(options.platform !== undefined && { platform: options.platform }),
    ...(options.scratchBaseCandidates !== undefined && {
      scratchBaseCandidates: options.scratchBaseCandidates,
    }),
    ...(options.outputChannel !== undefined && { outputChannel: options.outputChannel }),
  };

  await runRsvgConvertWithAsciiScratch({
    executable: options.rsvgConvertPath,
    sourcePath,
    outputPath,
    run: options.runRsvgConvert ?? executeRsvgConvert,
    scratch,
    ...(options.signal !== undefined && { signal: options.signal }),
  });
}

async function executeRsvgConvert(executable: string, args: string[], signal?: AbortSignal): Promise<void> {
  await runExternalTool({
    toolName: 'rsvg-convert',
    executable,
    args,
    ...(signal !== undefined && { signal }),
  });
}

async function writeEpsToPdf(
  sourcePath: string,
  outputPath: string,
  options: CombineImagesToPdfOptions,
): Promise<void> {
  if (!options.ghostscriptPath) {
    throw new Error('Ghostscript is required for EPS conversion.');
  }

  options.signal?.throwIfAborted();
  const epsStaging = path.join(path.dirname(outputPath), 'eps-temp');
  await mkdir(epsStaging, { recursive: true });

  const epsOptions: EpsToPdfOptions = {
    epsPath: sourcePath,
    workspacePath: options.workspacePath,
    ghostscriptPath: options.ghostscriptPath,
    stagingDirectory: epsStaging,
  };
  if (options.signal !== undefined) {
    epsOptions.signal = options.signal;
  }
  if (options.outputChannel !== undefined) {
    epsOptions.outputChannel = options.outputChannel;
  }
  if (options.scratchBaseCandidates !== undefined) {
    epsOptions.scratchBaseCandidates = options.scratchBaseCandidates;
  }
  if (options.platform !== undefined) {
    epsOptions.platform = options.platform;
  }

  const { pdfPath } = await convertEpsToPdf(epsOptions);
  options.signal?.throwIfAborted();
  await assertWritablePathInWorkspace(outputPath, options.workspacePath);
  await writeFile(outputPath, await readFile(pdfPath));
  options.signal?.throwIfAborted();
}
