import path from 'node:path';

import * as vscode from 'vscode';

import { readGhostscriptExecutablePath, readRsvgConvertExecutablePath } from '../config/external_tool_paths.js';
import { combineImagesToPdf } from '../operations/combine_images_to_pdf.js';

import type { CommandDependencies } from './command_dependencies.js';
import { resolveOutputConflicts } from './safe_mode.js';
import { userMessage } from './user_messages.js';

export const COMBINE_IMAGES_TO_PDF_COMMAND = 'latex-graphics-helper.convertImagesToSinglePdf';

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
    const rsvgConvertPath = readRsvgConvertExecutablePath(configuration);
    const ghostscriptPath = readGhostscriptExecutablePath(configuration);

    let outputPath: string;

    if (sourceUris.length === 1) {
      const sourceUri = sourceUris[0]!;
      const template =
        configuration.get<string>('outputPath.convertImagesToSinglePdf') ??
        '${fileDirname}/${fileBasenameNoExtension}.pdf';
      outputPath = template
        .replaceAll('${fileDirname}', path.dirname(sourceUri.fsPath))
        .replaceAll('${fileBasenameNoExtension}', path.basename(sourceUri.fsPath, path.extname(sourceUri.fsPath)));
    } else {
      const saveUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(path.join(workspacePath, 'combined.pdf')),
        filters: { 'PDF files': ['pdf'] },
      });

      if (!saveUri) {
        return;
      }

      assertOutputInsideWorkspace(saveUri, workspaceFolder);
      outputPath = saveUri.fsPath;
    }

    const jobs = sourceUris.map((sourceUri) => ({ sourcePath: sourceUri.fsPath }));

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: userMessage('message.progress.convertToOutput.title', jobs.length, 'PDF'),
        cancellable: true,
      },
      async (_progress, token) => {
        const controller = new AbortController();
        const cancellation = token.onCancellationRequested(() => controller.abort());

        try {
          await combineImagesToPdf({
            jobs,
            outputPath,
            workspacePath,
            signal: controller.signal,
            rsvgConvertPath,
            ghostscriptPath,
            platform: process.platform,
            resolveOutputConflicts,
            ...(outputChannel !== undefined && { outputChannel }),
          });
        } finally {
          cancellation.dispose();
        }

        await vscode.window.showInformationMessage(
          userMessage('message.convertToOutput.success', jobs.length, 'PDF'),
        );
      },
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(userMessage('message.convertToOutput.failed', 'PDF', message));
  }
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
