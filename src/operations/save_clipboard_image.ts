import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { convertPngToPdfFiles } from "./convert_png_to_pdf.js";
import {
  cleanupConversionArtifacts,
  type ConversionArtifactRoot,
} from "./cleanup_conversion_artifacts.js";
import {
  commitConversionOutputs,
  type CommittedConversionOutput,
  type PreparedConversionOutput,
} from "./commit_conversion_outputs.js";
import type { ConversionRuntime } from "./conversion_runtime.js";
import { assertWritablePathInWorkspace } from "../security/workspace_path.js";

export interface ClipboardImageData {
  type: { ext: string };
  buffer: Buffer;
}

export type ClipboardPasteKind = "pdf" | "image";

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

/** Saves one clipboard payload through the same staging and commit boundary as conversions. */
export async function saveClipboardImage(
  request: SaveClipboardImageRequest,
  runtime: ConversionRuntime,
): Promise<SavedClipboardImage> {
  const runId = request.runId ?? randomUUID();
  const artifact: ConversionArtifactRoot = {
    rootPath: clipboardStagingRoot(request.workspacePath, runId),
    workspacePath: request.workspacePath,
  };

  try {
    runtime.signal?.throwIfAborted();
    const stagedImage = await stageClipboardImage(request, runId);
    runtime.signal?.throwIfAborted();
    runtime.outputChannel?.appendLine(
      `[clipboard-paste] staged input: ${stagedImage.stagedOutputPath}`,
    );

    const outputs =
      request.kind === "pdf"
        ? await saveClipboardImageAsPdf(request, stagedImage, runId, runtime)
        : await commitConversionOutputs([stagedImage], {
            ...(runtime.resolveConflicts !== undefined && {
              resolveConflicts: runtime.resolveConflicts,
            }),
            ...(runtime.signal !== undefined && { signal: runtime.signal }),
            operationName: "clipboard-paste",
            ...(runtime.outputChannel !== undefined && { outputChannel: runtime.outputChannel }),
          });

    runtime.signal?.throwIfAborted();
    return { outputs, artifact };
  } catch (error) {
    await cleanupSavedClipboardImage({ outputs: [], artifact }, false, runtime);
    throw error;
  }
}

/** Finishes the operation after optional Undo registration. */
export async function cleanupSavedClipboardImage(
  saved: SavedClipboardImage,
  undoRecorded: boolean,
  runtime: Pick<ConversionRuntime, "outputChannel"> = {},
): Promise<void> {
  await cleanupConversionArtifacts(
    [
      {
        ...saved.artifact,
        ...(undoRecorded
          ? {
              preservePaths: saved.outputs.flatMap((output) =>
                output.previousFilePath ? [output.previousFilePath] : [],
              ),
            }
          : {}),
      },
    ],
    runtime.outputChannel,
  );
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
        outputPath: appendExtension(request.outputBasePath, "pdf"),
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
  return path.join(workspacePath, ".latex-graphics-helper", "clipboard-paste", runId);
}

async function stageClipboardImage(
  request: SaveClipboardImageRequest,
  runId: string,
): Promise<PreparedConversionOutput> {
  const stagedOutputPath = path.join(
    request.workspacePath,
    ".latex-graphics-helper",
    "clipboard-paste",
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
  const normalizedExtension = extension.startsWith(".") ? extension : `.${extension}`;
  const currentExtension = path.extname(outputPath).toLowerCase();

  if (
    currentExtension === normalizedExtension ||
    (normalizedExtension === ".jpeg" && currentExtension === ".jpg")
  ) {
    return outputPath;
  }

  return `${outputPath}${normalizedExtension}`;
}
