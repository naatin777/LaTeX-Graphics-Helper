import path from 'node:path';

import * as vscode from 'vscode';

import { readDrawioExecutablePath } from '../config/drawio_path.js';
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
    const sourceUris = uris ?? (uri ? [uri] : []);

    if (sourceUris.length === 0) {
      throw new Error('No files were selected.');
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(sourceUris[0]!);
    const workspacePath = workspaceFolder?.uri.fsPath ?? path.dirname(sourceUris[0]!.fsPath);

    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    const rsvgConvertPath = readRsvgConvertExecutablePath(configuration);
    const ghostscriptPath = readGhostscriptExecutablePath(configuration);
    const drawioPath = readDrawioExecutablePath(configuration);

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
      outputPath = saveUri.fsPath;
    }

    const jobs = sourceUris.map((u) => ({ sourcePath: u.fsPath }));

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: userMessage('message.progress.convertToOutput.title', jobs.length, 'PDF'),
        cancellable: true,
      },
      async (_progress, token) => {
        const controller = new AbortController();
        token.onCancellationRequested(() => controller.abort());

        await combineImagesToPdf({
          jobs,
          outputPath,
          workspacePath,
          signal: controller.signal,
          rsvgConvertPath,
          ghostscriptPath,
          drawioPath,
          resolveOutputConflicts,
          ...(outputChannel !== undefined && { outputChannel }),
        });

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
