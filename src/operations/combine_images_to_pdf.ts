import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { run as runMermaidCli } from '@mermaid-js/mermaid-cli';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

import { isEditableDrawioImagePath, isMermaidPath } from '../application/source_format.js';
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

const execFileAsync = promisify(execFile);

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
  ghostscriptPath?: string;
  drawioPath?: string;
  platform?: NodeJS.Platform;
  scratchBaseCandidates?: readonly string[];
  resolveOutputConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  outputChannel?: LineOutputChannel;
}

export async function combineImagesToPdf(
  options: CombineImagesToPdfOptions,
): Promise<CommittedConversionOutput[]> {
  options.signal?.throwIfAborted();

  if (options.jobs.length === 0) {
    throw new Error('No images were selected.');
  }

  await assertPreflightPassed(options.jobs, options.outputChannel);
  options.signal?.throwIfAborted();

  await Promise.all([
    ...options.jobs.map((job) =>
      assertExistingPathInWorkspace(job.sourcePath, options.workspacePath),
    ),
    assertWritablePathInWorkspace(options.outputPath, options.workspacePath),
    assertWritablePathInWorkspace(
      path.join(options.workspacePath, '.latex-graphics-helper', 'combine-images'),
      options.workspacePath,
    ),
  ]);
  options.signal?.throwIfAborted();

  const runId = options.runId ?? `${Date.now()}-${crypto.randomUUID()}`;
  const stagingRootPath = path.join(options.workspacePath, '.latex-graphics-helper', 'combine-images', runId);
  const artifacts: ConversionArtifactRoot[] = [{ rootPath: stagingRootPath, workspacePath: options.workspacePath }];

  try {
    await mkdir(stagingRootPath, { recursive: true });

    // Convert each input to a single-page PDF in staging
    const pdfPaths: string[] = [];

    for (let i = 0; i < options.jobs.length; i++) {
      options.signal?.throwIfAborted();
      const job = options.jobs[i]!;
      const pdfPath = path.join(stagingRootPath, `page-${i + 1}.pdf`);
      await convertToPdf(job.sourcePath, pdfPath, options);
      pdfPaths.push(pdfPath);
    }

    // Merge all generated PDFs
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

async function convertToPdf(
  sourcePath: string,
  outputPath: string,
  options: CombineImagesToPdfOptions,
): Promise<void> {
  const extension = path.extname(sourcePath).toLowerCase();

  if (isEditableDrawioImagePath(sourcePath)) {
    await writeDrawioToPdf(sourcePath, outputPath, options);
    return;
  }

  if (isMermaidPath(sourcePath)) {
    await writeMermaidToPdf(sourcePath, outputPath, options);
    return;
  }

  if (extension === '.svg') {
    await writeSvgToPdf(sourcePath, outputPath, options);
    return;
  }

  if (extension === '.eps') {
    await writeEpsToPdf(sourcePath, outputPath, options);
    return;
  }

  // Raster image (PNG, JPEG, WebP, AVIF, GIF, TIFF)
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

  await assertWritablePathInWorkspace(outputPath, workspacePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, await pdfDocument.save());
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

  // rsvg-convert SVG → PDF directly
  await execFileAsync(options.rsvgConvertPath, ['-f', 'pdf', '-o', outputPath, sourcePath], {
    signal: options.signal,
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

  const epsOpts: EpsToPdfOptions = {
    epsPath: sourcePath,
    workspacePath: options.workspacePath,
    ghostscriptPath: options.ghostscriptPath,
    stagingDirectory: epsStaging,
  };
  if (options.signal !== undefined) { epsOpts.signal = options.signal; }
  if (options.outputChannel !== undefined) { epsOpts.outputChannel = options.outputChannel; }
  if (options.scratchBaseCandidates !== undefined) { epsOpts.scratchBaseCandidates = options.scratchBaseCandidates; }
  if (options.platform !== undefined) { epsOpts.platform = options.platform; }

  const { pdfPath } = await convertEpsToPdf(epsOpts);
  options.signal?.throwIfAborted();
  await writeFile(outputPath, await readFile(pdfPath));
}

async function writeMermaidToPdf(
  sourcePath: string,
  outputPath: string,
  options: CombineImagesToPdfOptions,
): Promise<void> {
  options.signal?.throwIfAborted();
  await assertWritablePathInWorkspace(outputPath, options.workspacePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  options.signal?.throwIfAborted();

  await runMermaidCli(sourcePath, outputPath as `${string}.pdf`, {
    outputFormat: 'pdf',
    puppeteerConfig: {
      channel: 'chrome',
      headless: true,
    },
    quiet: true,
  });
}

async function writeDrawioToPdf(
  sourcePath: string,
  outputPath: string,
  options: CombineImagesToPdfOptions,
): Promise<void> {
  if (!options.drawioPath) {
    throw new Error('Draw.io is required for Draw.io conversion.');
  }
  options.signal?.throwIfAborted();
  await assertWritablePathInWorkspace(outputPath, options.workspacePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  options.signal?.throwIfAborted();

  await execFileAsync(options.drawioPath, ['-x', '-f', 'pdf', '-o', outputPath, sourcePath], {
    signal: options.signal,
  });
}
