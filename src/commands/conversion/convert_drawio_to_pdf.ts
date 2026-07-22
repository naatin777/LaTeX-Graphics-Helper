import * as vscode from 'vscode';

import { isDrawioPath } from '../../application/policy/source_format.js';
import { readDrawioExecutablePath } from '../../config/external_tools/external_tool_paths.js';
import { convertDrawioToPdfFiles, type DrawioPdfJob } from '../../operations/conversion/convert_drawio_to_pdf.js';

import type { CommandDependencies } from '../shared/command_dependencies.js';
import { resolveOutputConflicts } from '../lifecycle/safe_mode.js';
import { runOutputConversion } from '../lifecycle/run_output_conversion.js';
import { userMessage } from '../shared/user_messages.js';
import { selectedUris } from '../shared/command_utils.js';

export const CONVERT_DRAWIO_TO_PDF_COMMAND = 'latex-graphics-helper.convertDrawioToPdf';
export const CONVERT_DRAWIO_TO_PDF_DIRECTLY_COMMAND = 'latex-graphics-helper.convertDrawioToPdfDirectly';

const DEFAULT_OUTPUT_PATH = '${fileDirname}/${fileBasenameNoExtension}/${page}.pdf';
const DEFAULT_DIRECT_OUTPUT_PATH = '${fileDirname}/${fileBasenameNoExtension}.pdf';

export async function convertDrawioToPagePdfsCommand(
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
  dependencies?: CommandDependencies,
): Promise<void> {
  const commandOptions: Parameters<typeof runDrawioPdfCommand>[0] = {
    outputMode: 'page-pdfs' as const,
    outputSetting: 'outputPath.convertDrawioToPdf' as const,
    defaultOutputPath: DEFAULT_OUTPUT_PATH,
    operationName: 'convert-drawio-to-pdf',
  };
  if (uri !== undefined) {
    commandOptions.uri = uri;
  }
  if (uris !== undefined) {
    commandOptions.uris = uris;
  }
  if (dependencies?.outputChannel !== undefined) {
    commandOptions.outputChannel = dependencies.outputChannel;
  }
  await runDrawioPdfCommand(commandOptions);
}

export async function convertDrawioToSinglePdfCommand(
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
  dependencies?: CommandDependencies,
): Promise<void> {
  const commandOptions: Parameters<typeof runDrawioPdfCommand>[0] = {
    outputMode: 'single-pdf' as const,
    outputSetting: 'outputPath.convertDrawioToPdfDirectly' as const,
    defaultOutputPath: DEFAULT_DIRECT_OUTPUT_PATH,
    operationName: 'convert-drawio-to-pdf-directly',
  };
  if (uri !== undefined) {
    commandOptions.uri = uri;
  }
  if (uris !== undefined) {
    commandOptions.uris = uris;
  }
  if (dependencies?.outputChannel !== undefined) {
    commandOptions.outputChannel = dependencies.outputChannel;
  }
  await runDrawioPdfCommand(commandOptions);
}

async function runDrawioPdfCommand(options: {
  uri?: vscode.Uri;
  uris?: vscode.Uri[];
  outputMode: 'page-pdfs' | 'single-pdf';
  outputSetting: 'outputPath.convertDrawioToPdf' | 'outputPath.convertDrawioToPdfDirectly';
  defaultOutputPath: string;
  operationName: string;
  outputChannel?: CommandDependencies['outputChannel'];
}): Promise<void> {
  try {
    const sourceUris = selectedUris(options.uri, options.uris);
    if (sourceUris.length === 0) {
      throw new Error('No Draw.io files were selected.');
    }

    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    const configuredOutputTemplate = configuration.get<string>(options.outputSetting, options.defaultOutputPath);
    const outputTemplate = configuredOutputTemplate.trim() ? configuredOutputTemplate : options.defaultOutputPath;
    const jobs = sourceUris.map((sourceUri) => createJob(sourceUri, outputTemplate));
    const drawioPath = readDrawioExecutablePath(configuration);

    await runOutputConversion({
      operationName: options.operationName,
      ...(options.outputChannel !== undefined && { outputChannel: options.outputChannel }),
      resolveConflicts: resolveOutputConflicts,
      messages: {
        progressTitle: userMessage(
          options.outputMode === 'page-pdfs'
            ? 'message.progress.convertDrawioToPdf.title'
            : 'message.progress.convertDrawioToPdfDirectly.title',
          jobs.length,
        ),
        prepareMessage: userMessage('message.progress.prepareConversion', 'Draw.io PDF'),
        successMessage: (count) =>
          userMessage(
            options.outputMode === 'page-pdfs'
              ? 'message.convertDrawioToPdf.success'
              : 'message.convertDrawioToPdfDirectly.success',
            count,
          ),
        undoUnavailableMessage: (success, reason) => userMessage('message.undoUnavailable', success, reason),
        cancelledMessage: userMessage(
          options.outputMode === 'page-pdfs'
            ? 'message.convertDrawioToPdf.cancelled'
            : 'message.convertDrawioToPdfDirectly.cancelled',
        ),
        failedMessage: (reason) =>
          userMessage(
            options.outputMode === 'page-pdfs'
              ? 'message.convertDrawioToPdf.failed'
              : 'message.convertDrawioToPdfDirectly.failed',
            reason,
          ),
      },
      run: (runtime) =>
        convertDrawioToPdfFiles({
          jobs,
          drawioPath,
          outputMode: options.outputMode,
          runtime,
        }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(
      userMessage(
        options.outputMode === 'page-pdfs'
          ? 'message.convertDrawioToPdf.failed'
          : 'message.convertDrawioToPdfDirectly.failed',
        message,
      ),
    );
  }
}

function createJob(sourceUri: vscode.Uri, outputTemplate: string): DrawioPdfJob {
  if (sourceUri.scheme !== 'file') {
    throw new Error(`Only local Draw.io files are supported: ${sourceUri.toString()}`);
  }

  const workspace = vscode.workspace.getWorkspaceFolder(sourceUri);
  if (!workspace) {
    throw new Error(`The Draw.io file must be inside an open workspace: ${sourceUri.fsPath}`);
  }

  if (!isDrawioPath(sourceUri.fsPath)) {
    throw new Error(`Only Draw.io files are supported: ${sourceUri.fsPath}`);
  }

  return {
    sourcePath: sourceUri.fsPath,
    outputTemplate,
    workspacePath: workspace.uri.fsPath,
    workspaceName: workspace.name,
  };
}
