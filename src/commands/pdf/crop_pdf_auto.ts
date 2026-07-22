import path from 'node:path';

import * as vscode from 'vscode';

import { resolveOutputPath } from '../../config/output/resolve_output_path.js';
import { readGhostscriptExecutablePath } from '../../config/external_tools/external_tool_paths.js';
import { localeMap } from '../../locale_map.js';
import { cropPdfFiles, type CropPdfJob } from '../../operations/pdf/crop_pdf_auto.js';

import type { CommandDependencies } from '../shared/command_dependencies.js';
import { withCancellationSignal } from '../lifecycle/progress_cancellation.js';
import { resolveOutputConflicts } from '../lifecycle/safe_mode.js';
import { createPreflightWarningConfirmation } from '../lifecycle/preflight_warning_confirmation.js';
import { rememberLastConversion, UNDO_LAST_CONVERSION_COMMAND } from '../lifecycle/undo_last_conversion.js';
import { userMessage } from '../shared/user_messages.js';
import { isAbortError, selectedUris } from '../shared/command_utils.js';

const DEFAULT_MARGIN_OPTIONS = [0, 5, 10, 20];
const DEFAULT_OUTPUT_PATH = '${fileDirname}/${fileBasenameNoExtension}-crop.pdf';
export const CROP_PDF_AUTO_COMMAND = 'latex-graphics-helper.cropPdf.auto';

export async function cropPdfAutoCommand(
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
  dependencies?: CommandDependencies,
): Promise<void> {
  const outputChannel = dependencies?.outputChannel;
  try {
    const sourceUris = selectedUris(uri, uris);

    if (sourceUris.length === 0) {
      throw new Error('No PDF files were selected.');
    }

    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    const marginOptions = readMarginOptions(configuration.get<unknown>('cropPdf.marginOptions'));
    const selectedMargin = await selectMargin(marginOptions);

    if (selectedMargin === undefined) {
      return;
    }

    const outputTemplate = configuration.get<string>('outputPath.cropPdf', DEFAULT_OUTPUT_PATH);
    const jobs = sourceUris.map((sourceUri) => createJob(sourceUri, outputTemplate));
    const ghostscriptPath = readGhostscriptExecutablePath(configuration);
    const outputs = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: userMessage('message.progress.cropPdf.title', jobs.length),
        cancellable: true,
      },
      async (progress, token) => {
        return withCancellationSignal(token, async (signal) => {
          progress.report({ message: userMessage('message.progress.prepareConversion', 'PDF') });
          return cropPdfFiles({
            jobs,
            margin: selectedMargin,
            ghostscriptPath,
            signal,
            ...(outputChannel !== undefined && { outputChannel }),
            resolveOutputConflicts,
            onConfirmWarnings: createPreflightWarningConfirmation('crop-pdf'),
          });
        });
      },
    );

    const successMessage = userMessage('message.cropPdf.success', jobs.length);
    let undoId: string;

    try {
      undoId = await rememberLastConversion(outputs, outputChannel);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await vscode.window.showWarningMessage(userMessage('message.undoUnavailable', successMessage, message));
      return;
    }

    const undoAction = userMessage('message.action.undo');
    const selectedAction = await vscode.window.showInformationMessage(successMessage, undoAction);

    if (selectedAction === undoAction) {
      await vscode.commands.executeCommand(UNDO_LAST_CONVERSION_COMMAND, undoId);
    }
  } catch (error) {
    if (isAbortError(error)) {
      await vscode.window.showInformationMessage(userMessage('message.cropPdf.cancelled'));
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(userMessage('message.cropPdf.failed', message));
  }
}

function createJob(sourceUri: vscode.Uri, outputTemplate: string): CropPdfJob {
  if (sourceUri.scheme !== 'file') {
    throw new Error(`Only local PDF files are supported: ${sourceUri.toString()}`);
  }

  const workspace = vscode.workspace.getWorkspaceFolder(sourceUri);

  if (!workspace) {
    throw new Error(`The PDF must be inside an open workspace: ${sourceUri.fsPath}`);
  }

  const sourcePath = sourceUri.fsPath;

  if (path.extname(sourcePath).toLowerCase() !== '.pdf') {
    throw new Error(`Only PDF files can be cropped: ${sourcePath}`);
  }

  return {
    sourcePath,
    workspacePath: workspace.uri.fsPath,
    outputPath: resolveOutputPath(outputTemplate, {
      workspacePath: workspace.uri.fsPath,
      workspaceName: workspace.name,
      sourcePath,
    }),
  };
}

function readMarginOptions(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return DEFAULT_MARGIN_OPTIONS;
  }

  const options = value.filter(
    (item): item is number => typeof item === 'number' && Number.isFinite(item) && item >= 0,
  );
  const uniqueOptions = [...new Set(options)];

  return uniqueOptions.length > 0 ? uniqueOptions : DEFAULT_MARGIN_OPTIONS;
}

async function selectMargin(options: number[]): Promise<number | undefined> {
  const items = options.map((margin) => ({
    label: `${margin} pt`,
    description:
      margin === 0
        ? localeMap('quickPick.cropPdf.margin.detectedBounds')
        : localeMap('quickPick.cropPdf.margin.keepAroundContent').replace('{0}', margin.toString()),
    margin,
  }));
  const selected = await vscode.window.showQuickPick(items, {
    title: localeMap('quickPick.cropPdf.margin.title'),
    placeHolder: localeMap('quickPick.cropPdf.margin.placeholder'),
  });

  return selected?.margin;
}
