import * as vscode from 'vscode';

import { logicalSourcePathForOutputTemplate } from '../application/source_format.js';
import { readGhostscriptExecutablePath } from '../config/external_tool_paths.js';
import { readOutputFormatOutputTemplate } from '../config/output_path_settings.js';
import { resolveOutputPath } from '../config/resolve_output_path.js';
import { combineImagesToPdf, type CombineImagesToPdfOptions } from '../operations/combine_images_to_pdf.js';
import { assertWritablePathInWorkspace } from '../security/workspace_path.js';

import type { CommandDependencies } from './command_dependencies.js';
import { readSvgToPdfOptions } from './convert_png_to_pdf.js';
import { createOutputConversionMessages, runOutputConversion } from './run_output_conversion.js';
import { resolveOutputConflicts } from './safe_mode.js';
import { userMessage } from './user_messages.js';

export const COMBINE_IMAGES_TO_PDF_COMMAND = 'latex-graphics-helper.convertImagesToSinglePdf';
const DEFAULT_OUTPUT_PATH = '${fileDirname}/${fileBasenameNoExtension}.pdf';
const OUTPUT_PATH_SETTING = 'outputPath.convertImagesToSinglePdf';

export async function convertImagesToSinglePdfCommand(
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
  dependencies?: CommandDependencies,
): Promise<void> {
  const outputChannel = dependencies?.outputChannel;

  try {
    const sourceUris = selectedUris(uri, uris);

    if (sourceUris.length === 0) {
      throw new Error('No files were selected.');
    }

    const workspaceFolder = requireSingleWorkspace(sourceUris);
    const workspacePath = workspaceFolder.uri.fsPath;
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    const outputTemplate = readOutputFormatOutputTemplate(configuration, OUTPUT_PATH_SETTING);
    const outputPath = await resolveCombineOutputPath(sourceUris, workspaceFolder, outputTemplate);

    if (outputPath === undefined) {
      return;
    }

    await assertWritablePathInWorkspace(outputPath, workspacePath);

    const svgToPdf = readSvgToPdfOptions(configuration);
    const ghostscriptPath = readGhostscriptExecutablePath(configuration);
    const jobs = sourceUris.map((sourceUri) => ({ sourcePath: sourceUri.fsPath }));

    await runOutputConversion({
      operationName: 'combine-images-to-pdf',
      ...(outputChannel !== undefined && { outputChannel }),
      resolveConflicts: resolveOutputConflicts,
      messages: createOutputConversionMessages('PDF', jobs.length),
      run: (runtime) => {
        const combineOptions: CombineImagesToPdfOptions = {
          jobs,
          outputPath,
          workspacePath,
          svgToPdf,
          ghostscriptPath,
          platform: process.platform,
        };
        if (runtime.signal !== undefined) {
          combineOptions.signal = runtime.signal;
        }
        if (runtime.resolveConflicts !== undefined) {
          combineOptions.resolveOutputConflicts = runtime.resolveConflicts;
        }
        if (runtime.outputChannel !== undefined) {
          combineOptions.outputChannel = runtime.outputChannel;
        }
        if (runtime.reportProgress !== undefined) {
          combineOptions.reportProgress = runtime.reportProgress;
        }
        return combineImagesToPdf(combineOptions);
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(userMessage('message.convertToOutput.failed', 'PDF', message));
  }
}

async function resolveCombineOutputPath(
  sourceUris: vscode.Uri[],
  workspaceFolder: vscode.WorkspaceFolder,
  configuredTemplate: string | undefined,
): Promise<string | undefined> {
  const sourceUri = sourceUris[0]!;

  if (configuredTemplate !== undefined || sourceUris.length === 1) {
    const template = configuredTemplate ?? DEFAULT_OUTPUT_PATH;
    return resolveOutputPath(template, {
      sourcePath: logicalSourcePathForOutputTemplate(sourceUri.fsPath),
      workspacePath: workspaceFolder.uri.fsPath,
      workspaceName: workspaceFolder.name,
    });
  }

  const saveUri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.joinPath(workspaceFolder.uri, 'combined.pdf'),
    filters: { 'PDF files': ['pdf'] },
  });

  if (!saveUri) {
    return undefined;
  }

  assertOutputInsideWorkspace(saveUri, workspaceFolder);
  return saveUri.fsPath;
}

function selectedUris(uri?: vscode.Uri, uris?: vscode.Uri[]): vscode.Uri[] {
  const candidates = uris && uris.length > 0 ? uris : uri ? [uri] : [];
  return [...new Map(candidates.map((candidate) => [candidate.toString(), candidate])).values()];
}

function requireSingleWorkspace(sourceUris: vscode.Uri[]): vscode.WorkspaceFolder {
  for (const sourceUri of sourceUris) {
    if (sourceUri.scheme !== 'file') {
      throw new Error(`Only local files are supported: ${sourceUri.toString()}`);
    }
  }

  const firstSource = sourceUris[0]!;
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(firstSource);

  if (!workspaceFolder) {
    throw new Error(`The file must be inside an open workspace: ${firstSource.fsPath}`);
  }

  for (const sourceUri of sourceUris.slice(1)) {
    const sourceWorkspace = vscode.workspace.getWorkspaceFolder(sourceUri);
    if (!sourceWorkspace || sourceWorkspace.uri.toString() !== workspaceFolder.uri.toString()) {
      throw new Error(`All selected files must be inside the same open workspace: ${sourceUri.fsPath}`);
    }
  }

  return workspaceFolder;
}

function assertOutputInsideWorkspace(outputUri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder): void {
  if (outputUri.scheme !== 'file') {
    throw new Error(`Only local output files are supported: ${outputUri.toString()}`);
  }

  const outputWorkspace = vscode.workspace.getWorkspaceFolder(outputUri);
  if (!outputWorkspace || outputWorkspace.uri.toString() !== workspaceFolder.uri.toString()) {
    throw new Error(`The output file must be inside the selected workspace: ${outputUri.fsPath}`);
  }
}
