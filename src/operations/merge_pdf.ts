import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument } from 'pdf-lib';

import { assertExistingPathInWorkspace, assertWritablePathInWorkspace } from '../security/workspace_path.js';

import { cleanupConversionArtifacts, type ConversionArtifactRoot } from './cleanup_conversion_artifacts.js';
import {
  commitConversionOutputs,
  type CommittedConversionOutput,
  type OutputConflictDecision,
} from './commit_conversion_outputs.js';
import type { LineOutputChannel } from './external_tool_ascii_scratch.js';

export interface MergePdfOptions {
  sourcePaths: string[];
  outputPath: string;
  workspacePath: string;
  runId?: string;
  signal?: AbortSignal;
  resolveOutputConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  outputChannel?: LineOutputChannel;
}

export async function mergePdf(options: MergePdfOptions): Promise<CommittedConversionOutput[]> {
  const { sourcePaths, outputPath, workspacePath } = options;

  options.outputChannel?.appendLine(`[merge-pdf] input paths: ${sourcePaths.join(', ')}`);
  options.outputChannel?.appendLine(`[merge-pdf] requested output: ${outputPath}`);

  if (sourcePaths.length < 2) {
    throw new Error('Select at least two PDF files.');
  }

  options.signal?.throwIfAborted();
  await Promise.all([
    ...sourcePaths.map((sourcePath) => assertExistingPathInWorkspace(sourcePath, workspacePath)),
    assertWritablePathInWorkspace(outputPath, workspacePath),
    assertWritablePathInWorkspace(path.join(workspacePath, '.latex-graphics-helper', 'merge-pdf'), workspacePath),
  ]);
  options.signal?.throwIfAborted();

  const mergedDocument = await PDFDocument.create();

  for (const sourcePath of sourcePaths) {
    options.signal?.throwIfAborted();
    const sourceDocument = await PDFDocument.load(await readFile(sourcePath));
    options.signal?.throwIfAborted();
    const pages = await mergedDocument.copyPages(sourceDocument, sourceDocument.getPageIndices());

    for (const page of pages) {
      options.signal?.throwIfAborted();
      mergedDocument.addPage(page);
    }
  }

  options.signal?.throwIfAborted();
  const runId = options.runId ?? `${Date.now()}-${crypto.randomUUID()}`;
  const stagingRootPath = path.join(workspacePath, '.latex-graphics-helper', 'merge-pdf', runId);
  const stagedOutputPath = path.join(stagingRootPath, 'result.pdf');

  const artifacts: ConversionArtifactRoot[] = [{ rootPath: stagingRootPath, workspacePath }];

  try {
    await assertWritablePathInWorkspace(stagedOutputPath, workspacePath);
    await mkdir(path.dirname(stagedOutputPath), { recursive: true });
    options.signal?.throwIfAborted();
    await writeFile(stagedOutputPath, await mergedDocument.save());
    options.signal?.throwIfAborted();

    return commitConversionOutputs([{ stagedOutputPath, outputPath, workspacePath, stagingRootPath }], {
      ...(options.signal !== undefined && { signal: options.signal }),
      ...(options.resolveOutputConflicts !== undefined && {
        resolveConflicts: options.resolveOutputConflicts,
      }),
      operationName: 'merge-pdf',
      ...(options.outputChannel !== undefined && { outputChannel: options.outputChannel }),
    });
  } catch (error) {
    await cleanupConversionArtifacts(artifacts, options.outputChannel);
    throw error;
  }
}
