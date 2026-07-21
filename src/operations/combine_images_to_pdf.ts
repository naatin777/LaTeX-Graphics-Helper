import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

import { assertExistingPathInWorkspace, assertWritablePathInWorkspace } from '../security/workspace_path.js';

import { cleanupConversionArtifacts, type ConversionArtifactRoot } from './cleanup_conversion_artifacts.js';
import {
  commitConversionOutputs,
  type CommittedConversionOutput,
  type OutputConflictDecision,
} from './commit_conversion_outputs.js';
import type { LineOutputChannel } from './external_tool_ascii_scratch.js';
import { assertPreflightPassed } from './input_preflight.js';

export interface CombineImagesJob {
  sourcePath: string;
}

export interface CombineImagesToPdfOptions {
  jobs: CombineImagesJob[];
  outputPath: string;
  workspacePath: string;
  runId?: string;
  signal?: AbortSignal;
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
    const mergedDocument = await PDFDocument.create();

    for (let i = 0; i < options.jobs.length; i++) {
      options.signal?.throwIfAborted();
      const job = options.jobs[i]!;
      const sourceBuffer = await readFile(job.sourcePath);
      options.signal?.throwIfAborted();
      const metadata = await sharp(sourceBuffer).metadata();
      options.signal?.throwIfAborted();
      const { width, height } = metadata;

      if (!width || !height) {
        throw new Error(`Could not determine image dimensions: ${job.sourcePath}`);
      }

      const imageBuffer = await sharp(sourceBuffer).png().toBuffer();
      options.signal?.throwIfAborted();
      const page = mergedDocument.addPage([width, height]);
      const embeddedImage = await mergedDocument.embedPng(imageBuffer);
      page.drawImage(embeddedImage, { x: 0, y: 0, width, height });
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
