import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument, type PDFPage } from 'pdf-lib';

import { assertExistingPathInWorkspace, assertWritablePathInWorkspace } from '../security/workspace_path.js';

import { cleanupConversionArtifacts, type ConversionArtifactRoot } from './cleanup_conversion_artifacts.js';
import {
  commitConversionOutputs,
  type CommittedConversionOutput,
  type OutputConflictDecision,
  type PreparedConversionOutput,
} from './commit_conversion_outputs.js';
import type { LineOutputChannel } from './external_tool_ascii_scratch.js';
import { assertPreflightPassed } from './input_preflight.js';

export interface CropBox {
  left: number;
  bottom: number;
  right: number;
  top: number;
}

export type CropTarget =
  | { type: 'all' }
  | {
      type: 'selected';
      pages: number[];
    };

export interface CropPdfConfigureJob {
  sourcePath: string;
  workspacePath: string;
  outputPath: string;
  cropBox: CropBox;
  target: CropTarget;
}

export interface CropPdfConfigureOptions {
  job: CropPdfConfigureJob;
  runId?: string;
  signal?: AbortSignal;
  resolveOutputConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  outputChannel?: LineOutputChannel;
}

export async function cropPdfWithConfiguredBox(options: CropPdfConfigureOptions): Promise<CommittedConversionOutput[]> {
  options.signal?.throwIfAborted();
  await validateJobPaths(options.job);

  await assertPreflightPassed([options.job]);
  options.signal?.throwIfAborted();

  const runId = options.runId ?? `${Date.now()}-${randomUUID()}`;
  const stagingRootPath = path.join(options.job.workspacePath, '.latex-graphics-helper', 'crop-pdf-configure', runId);
  const artifacts: ConversionArtifactRoot[] = [{ rootPath: stagingRootPath, workspacePath: options.job.workspacePath }];

  try {
    const preparedOutput = await createConfiguredCropOutput(options, runId);

    options.signal?.throwIfAborted();
    return await commitConversionOutputs([preparedOutput], {
      ...(options.signal !== undefined && { signal: options.signal }),
      ...(options.resolveOutputConflicts !== undefined && {
        resolveConflicts: options.resolveOutputConflicts,
      }),
      operationName: 'crop-pdf-configure',
      ...(options.outputChannel !== undefined && { outputChannel: options.outputChannel }),
    });
  } catch (error) {
    await cleanupConversionArtifacts(artifacts, options.outputChannel);
    throw error;
  }
}

async function createConfiguredCropOutput(
  options: CropPdfConfigureOptions,
  runId: string,
): Promise<PreparedConversionOutput> {
  const { job, signal } = options;
  const workDirectory = path.join(
    job.workspacePath,
    '.latex-graphics-helper',
    'crop-pdf-configure',
    runId,
    safeName(path.basename(job.sourcePath, path.extname(job.sourcePath))),
  );
  const copiedSourcePath = path.join(workDirectory, path.basename(job.sourcePath));
  const stagedOutputPath = path.join(workDirectory, 'result.pdf');

  signal?.throwIfAborted();
  await assertWritablePathInWorkspace(workDirectory, job.workspacePath);
  await mkdir(workDirectory, { recursive: true });
  await assertWritablePathInWorkspace(copiedSourcePath, job.workspacePath);
  await copyFile(job.sourcePath, copiedSourcePath);
  await assertExistingPathInWorkspace(copiedSourcePath, job.workspacePath);

  signal?.throwIfAborted();
  const document = await PDFDocument.load(await readFile(copiedSourcePath));
  const pages = document.getPages();
  const targetPageIndexes = targetToPageIndexes(job.target, pages.length);

  for (const pageIndex of targetPageIndexes) {
    signal?.throwIfAborted();
    setPageCropBox(pages[pageIndex], job.cropBox);
  }

  await assertWritablePathInWorkspace(stagedOutputPath, job.workspacePath);
  signal?.throwIfAborted();
  await writeFile(stagedOutputPath, await document.save());
  signal?.throwIfAborted();

  return {
    stagedOutputPath,
    outputPath: job.outputPath,
    workspacePath: job.workspacePath,
    stagingRootPath: path.join(job.workspacePath, '.latex-graphics-helper', 'crop-pdf-configure', runId),
  };
}

async function validateJobPaths(job: CropPdfConfigureJob): Promise<void> {
  await Promise.all([
    assertExistingPathInWorkspace(job.sourcePath, job.workspacePath),
    assertWritablePathInWorkspace(job.outputPath, job.workspacePath),
    assertWritablePathInWorkspace(
      path.join(job.workspacePath, '.latex-graphics-helper', 'crop-pdf-configure'),
      job.workspacePath,
    ),
  ]);
}

function targetToPageIndexes(target: CropTarget, pageCount: number): number[] {
  if (pageCount === 0) {
    throw new Error('PDF has no pages.');
  }

  if (target.type === 'all') {
    return Array.from({ length: pageCount }, (_value, index) => index);
  }

  if (target.pages.length === 0) {
    throw new Error('At least one page must be selected.');
  }

  const indexes = target.pages.map((page) => {
    if (!Number.isInteger(page) || page < 1 || page > pageCount) {
      throw new Error(`Selected page is out of range: ${page}`);
    }

    return page - 1;
  });

  return [...new Set(indexes)];
}

function setPageCropBox(page: PDFPage | undefined, cropBox: CropBox): void {
  if (!page) {
    throw new Error('Target page was not found.');
  }

  validateCropBox(cropBox, page);

  const width = cropBox.right - cropBox.left;
  const height = cropBox.top - cropBox.bottom;
  page.setMediaBox(cropBox.left, cropBox.bottom, width, height);
  page.setCropBox(cropBox.left, cropBox.bottom, width, height);
}

function validateCropBox(cropBox: CropBox, page: PDFPage): void {
  const mediaBox = page.getMediaBox();
  const mediaRight = mediaBox.x + mediaBox.width;
  const mediaTop = mediaBox.y + mediaBox.height;

  for (const [key, value] of Object.entries(cropBox)) {
    if (!Number.isFinite(value)) {
      throw new Error(`Crop box ${key} must be a finite number.`);
    }
  }

  if (cropBox.left >= cropBox.right || cropBox.bottom >= cropBox.top) {
    throw new Error('Crop box must have positive width and height.');
  }

  if (
    cropBox.left < mediaBox.x ||
    cropBox.bottom < mediaBox.y ||
    cropBox.right > mediaRight ||
    cropBox.top > mediaTop
  ) {
    throw new Error('Crop box must be inside the page media box.');
  }
}

function safeName(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '_');
}
