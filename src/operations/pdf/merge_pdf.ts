import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument } from 'pdf-lib';

import { assertExistingPathInWorkspace, assertWritablePathInWorkspace } from '../../security/workspace_path.js';

import { cleanupConversionArtifacts, type ConversionArtifactRoot } from '../lifecycle/cleanup_conversion_artifacts.js';
import {
  commitConversionOutputs,
  type CommitConversionOutputsOptions,
  type CommittedConversionOutput,
} from '../lifecycle/commit_conversion_outputs.js';
import type { ConversionRuntime } from '../lifecycle/conversion_runtime.js';
import { assertPreflightPassed, preflightOptionsFromRuntime } from '../input/input_preflight.js';

export interface MergePdfOptions {
  sourcePaths: string[];
  outputPath: string;
  workspacePath: string;
  runtime?: ConversionRuntime;
  runId?: string;
}

export async function mergePdf(options: MergePdfOptions): Promise<CommittedConversionOutput[]> {
  const { sourcePaths, outputPath, workspacePath, runtime } = options;

  runtime?.outputChannel?.appendLine(`[merge-pdf] input paths: ${sourcePaths.join(', ')}`);
  runtime?.outputChannel?.appendLine(`[merge-pdf] requested output: ${outputPath}`);

  if (sourcePaths.length < 2) {
    throw new Error('Select at least two PDF files.');
  }

  runtime?.signal?.throwIfAborted();

  const runId = options.runId ?? `${Date.now()}-${crypto.randomUUID()}`;
  const stagingRootPath = path.join(workspacePath, '.latex-graphics-helper', 'merge-pdf', runId);
  const stagedOutputPath = path.join(stagingRootPath, 'result.pdf');

  await Promise.all([
    ...sourcePaths.map((sourcePath) => assertExistingPathInWorkspace(sourcePath, workspacePath)),
    assertWritablePathInWorkspace(outputPath, workspacePath),
    assertWritablePathInWorkspace(path.join(workspacePath, '.latex-graphics-helper', 'merge-pdf'), workspacePath),
    assertWritablePathInWorkspace(stagingRootPath, workspacePath),
    assertWritablePathInWorkspace(stagedOutputPath, workspacePath),
  ]);
  runtime?.signal?.throwIfAborted();

  await assertPreflightPassed(
    sourcePaths.map((sourcePath) => ({ sourcePath })),
    preflightOptionsFromRuntime(runtime),
  );
  runtime?.signal?.throwIfAborted();

  const mergedDocument = await PDFDocument.create();

  for (const sourcePath of sourcePaths) {
    runtime?.signal?.throwIfAborted();
    const sourceDocument = await PDFDocument.load(await readFile(sourcePath));
    runtime?.signal?.throwIfAborted();
    const pages = await mergedDocument.copyPages(sourceDocument, sourceDocument.getPageIndices());

    for (const page of pages) {
      runtime?.signal?.throwIfAborted();
      mergedDocument.addPage(page);
    }
  }

  runtime?.signal?.throwIfAborted();
  const artifacts: ConversionArtifactRoot[] = [{ rootPath: stagingRootPath, workspacePath }];

  try {
    await assertWritablePathInWorkspace(stagedOutputPath, workspacePath);
    await mkdir(path.dirname(stagedOutputPath), { recursive: true });
    runtime?.signal?.throwIfAborted();
    await writeFile(stagedOutputPath, await mergedDocument.save());
    runtime?.signal?.throwIfAborted();

    const commitOptions: CommitConversionOutputsOptions = { operationName: 'merge-pdf' as const };
    if (runtime?.signal !== undefined) {
      commitOptions.signal = runtime.signal;
    }
    if (runtime?.resolveConflicts !== undefined) {
      commitOptions.resolveConflicts = runtime.resolveConflicts;
    }
    if (runtime?.outputChannel !== undefined) {
      commitOptions.outputChannel = runtime.outputChannel;
    }
    return commitConversionOutputs([{ stagedOutputPath, outputPath, workspacePath, stagingRootPath }], commitOptions);
  } catch (error) {
    await cleanupConversionArtifacts(artifacts, runtime?.outputChannel, error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}
