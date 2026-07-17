import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { assertWritablePathInWorkspace } from '../security/workspace_path.js';

import { cleanupConversionArtifacts, type ConversionArtifactRoot } from './cleanup_conversion_artifacts.js';
import {
  commitConversionOutputs,
  type CommitConversionOutputsOptions,
  type CommittedConversionOutput,
  type PreparedConversionOutput,
} from './commit_conversion_outputs.js';
import type { ConversionRuntime } from './conversion_runtime.js';
import { convertPngToPdfFiles } from './convert_png_to_pdf.js';

export interface ClipboardImageData {
  type: { ext: string };
  buffer: Buffer;
}

export type ClipboardPasteKind = 'pdf' | 'image';

export interface SaveClipboardImageRequest {
  data: ClipboardImageData;
  kind: ClipboardPasteKind;
  outputBasePath: string;
  workspacePath: string;
  runId?: string;
}

export interface SavedClipboardImage {
  outputs: CommittedConversionOutput[];
  artifact: ConversionArtifactRoot;
}

export interface SaveClipboardImageTestOverrides {
  commit?: Pick<CommitConversionOutputsOptions, 'copyFile' | 'rm'>;
}

/** Saves one clipboard payload through the same staging and commit boundary as conversions. */
export async function saveClipboardImage(
  request: SaveClipboardImageRequest,
  runtime: ConversionRuntime,
  testOverrides: SaveClipboardImageTestOverrides = {},
): Promise<SavedClipboardImage> {
  const runId = request.runId ?? randomUUID();
  const artifact: ConversionArtifactRoot = {
    rootPath: clipboardStagingRoot(request.workspacePath, runId),
    workspacePath: request.workspacePath,
  };

  let commitOwnsClipboardArtifact = false;

  try {
    runtime.signal?.throwIfAborted();
    const stagedImage = await stageClipboardImage(request, runId);
    runtime.signal?.throwIfAborted();
    runtime.outputChannel?.appendLine(`[clipboard-paste] staged input: ${stagedImage.stagedOutputPath}`);

    let outputs: CommittedConversionOutput[];

    if (request.kind === 'pdf') {
      outputs = await saveClipboardImageAsPdf(request, stagedImage, runId, runtime);
    } else {
      commitOwnsClipboardArtifact = true;
      outputs = await commitConversionOutputs([stagedImage], {
        ...(runtime.resolveConflicts !== undefined && {
          resolveConflicts: runtime.resolveConflicts,
        }),
        ...(runtime.signal !== undefined && { signal: runtime.signal }),
        operationName: 'clipboard-paste',
        ...(runtime.outputChannel !== undefined && { outputChannel: runtime.outputChannel }),
        ...testOverrides.commit,
      });
    }

    return { outputs, artifact };
  } catch (error) {
    if (!commitOwnsClipboardArtifact) {
      await cleanupClipboardSourceArtifact({ outputs: [], artifact }, false, runtime);
    }
    throw error;
  }
}

/** Finishes the operation after optional Undo registration. */
export async function cleanupClipboardSourceArtifact(
  saved: SavedClipboardImage,
  undoRecorded: boolean,
  runtime: Pick<ConversionRuntime, 'outputChannel'> = {},
): Promise<void> {
  await cleanupConversionArtifacts(
    [
      {
        ...saved.artifact,
        ...(undoRecorded
          ? {
              preservePaths: saved.outputs.flatMap((output) =>
                output.previousFilePath && isWithin(output.previousFilePath, saved.artifact.rootPath)
                  ? [output.previousFilePath]
                  : [],
              ),
            }
          : {}),
      },
    ],
    runtime.outputChannel,
  );
}

function isWithin(targetPath: string, parentPath: string): boolean {
  const relativePath = path.relative(path.resolve(parentPath), path.resolve(targetPath));
  return relativePath === '' || (!path.isAbsolute(relativePath) && !relativePath.startsWith(`..${path.sep}`));
}

async function saveClipboardImageAsPdf(
  request: SaveClipboardImageRequest,
  stagedImage: PreparedConversionOutput,
  runId: string,
  runtime: ConversionRuntime,
): Promise<CommittedConversionOutput[]> {
  return convertPngToPdfFiles({
    jobs: [
      {
        sourcePath: stagedImage.stagedOutputPath,
        outputPath: appendExtension(request.outputBasePath, 'pdf'),
        workspacePath: request.workspacePath,
      },
    ],
    runId,
    supportedExtensions: [`.${request.data.type.ext}`],
    ...(runtime.signal !== undefined && { signal: runtime.signal }),
    ...(runtime.resolveConflicts !== undefined && {
      resolveOutputConflicts: runtime.resolveConflicts,
    }),
    ...(runtime.outputChannel !== undefined && { outputChannel: runtime.outputChannel }),
  });
}

function clipboardStagingRoot(workspacePath: string, runId: string): string {
  return path.join(workspacePath, '.latex-graphics-helper', 'clipboard-paste', runId);
}

async function stageClipboardImage(
  request: SaveClipboardImageRequest,
  runId: string,
): Promise<PreparedConversionOutput> {
  const stagedOutputPath = path.join(
    request.workspacePath,
    '.latex-graphics-helper',
    'clipboard-paste',
    runId,
    `source.${request.data.type.ext}`,
  );
  const stagingRootPath = path.dirname(stagedOutputPath);

  await assertWritablePathInWorkspace(stagedOutputPath, request.workspacePath);
  await mkdir(stagingRootPath, { recursive: true });
  await writeFile(stagedOutputPath, request.data.buffer);

  return {
    stagedOutputPath,
    outputPath: appendExtension(request.outputBasePath, request.data.type.ext),
    workspacePath: request.workspacePath,
    stagingRootPath,
  };
}

function appendExtension(outputPath: string, extension: string): string {
  const normalizedExtension = extension.startsWith('.') ? extension : `.${extension}`;
  const currentExtension = path.extname(outputPath).toLowerCase();

  if (currentExtension === normalizedExtension || (normalizedExtension === '.jpeg' && currentExtension === '.jpg')) {
    return outputPath;
  }

  return `${outputPath}${normalizedExtension}`;
}
