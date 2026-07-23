import * as vscode from 'vscode';

import type { CommittedConversionOutput } from '../../operations/lifecycle/commit_conversion_outputs.js';
import type { ConversionRuntime } from '../../operations/lifecycle/conversion_runtime.js';
import type { ConfirmWarningsHandler } from '../../operations/input/input_preflight.js';
import type { LineOutputChannel } from '../../operations/external_tools/external_tool_ascii_scratch.js';

import { withCancellationSignal } from './progress_cancellation.js';
import { createPreflightWarningConfirmation } from './preflight_warning_confirmation.js';
import { rememberLastConversion, UNDO_LAST_CONVERSION_COMMAND } from './undo_last_conversion.js';
import { userMessage } from '../shared/user_messages.js';
import { isAbortError, errorMessage } from '../shared/command_utils.js';

export interface ConversionCommandMessages {
  progressTitle: string;
  prepareMessage: string;
  successMessage: (count: number) => string;
  undoUnavailableMessage: (successMessage: string, reason: string) => string;
  cancelledMessage: string;
  failedMessage: (reason: string) => string;
}

export type OutputConversionFormat =
  | 'PDF'
  | 'PNG'
  | 'JPEG'
  | 'WebP'
  | 'AVIF'
  | 'GIF'
  | 'TIFF'
  | 'SVG'
  | 'EPS'
  | 'RAW'
  | 'Draw.io';

export function createOutputConversionMessages(
  format: OutputConversionFormat,
  sourceCount: number,
): ConversionCommandMessages {
  return {
    progressTitle: userMessage('message.progress.convertToOutput.title', sourceCount, format),
    prepareMessage: userMessage('message.progress.prepareConversion', format),
    successMessage: (count) => userMessage('message.convertToOutput.success', count, format),
    undoUnavailableMessage: (success, reason) => userMessage('message.undoUnavailable', success, reason),
    cancelledMessage: userMessage('message.convertToOutput.cancelled', format),
    failedMessage: (reason) => userMessage('message.convertToOutput.failed', format, reason),
  };
}

/** Owns progress, cancellation, Undo registration, and user notifications for output conversion. */
export async function runOutputConversion(options: {
  operationName: string;
  messages: ConversionCommandMessages;
  outputChannel?: LineOutputChannel;
  resolveConflicts?: ConversionRuntime['resolveConflicts'];
  onConfirmWarnings?: ConfirmWarningsHandler;
  run: (runtime: ConversionRuntime) => Promise<CommittedConversionOutput[]>;
}): Promise<void> {
  try {
    const outputs = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: options.messages.progressTitle,
        cancellable: true,
      },
      async (progress, token) =>
        withCancellationSignal(token, async (signal) => {
          progress.report({ message: options.messages.prepareMessage });
          const runtimeOptions: ConversionRuntime = {
            signal,
            reportProgress: (completed: number, total: number) => {
              progress.report({ message: userMessage('message.progress.completedCount', completed, total) });
            },
          };
          if (options.outputChannel !== undefined) {
            runtimeOptions.outputChannel = options.outputChannel;
          }
          if (options.resolveConflicts !== undefined) {
            runtimeOptions.resolveConflicts = options.resolveConflicts;
          }
          runtimeOptions.onConfirmWarnings =
            options.onConfirmWarnings ?? createPreflightWarningConfirmation(options.operationName);
          return options.run(runtimeOptions);
        }),
    );
    const successMessage = options.messages.successMessage(outputs.length);
    let undoId: string;

    try {
      undoId = await rememberLastConversion(outputs, options.outputChannel);
    } catch (error) {
      const reason = errorMessage(error);
      options.outputChannel?.appendLine(`[${options.operationName}] Undo record failed: ${reason}`);
      await vscode.window.showWarningMessage(options.messages.undoUnavailableMessage(successMessage, reason));
      return;
    }

    const undoAction = userMessage('message.action.undo');
    const selectedAction = await vscode.window.showInformationMessage(successMessage, undoAction);
    if (selectedAction === undoAction) {
      await vscode.commands.executeCommand(UNDO_LAST_CONVERSION_COMMAND, undoId);
    }
  } catch (error) {
    if (isAbortError(error)) {
      options.outputChannel?.appendLine(`[${options.operationName}] cancellation requested`);
      await vscode.window.showInformationMessage(options.messages.cancelledMessage);
      return;
    }

    const reason = errorMessage(error);
    options.outputChannel?.appendLine(`[${options.operationName}] failure: ${reason}`);
    await vscode.window.showErrorMessage(options.messages.failedMessage(reason));
  }
}
