import * as vscode from "vscode";

import type { CommittedConversionOutput } from "../operations/commit_conversion_outputs.js";
import type { ConversionRuntime } from "../operations/conversion_runtime.js";
import type { LineOutputChannel } from "../operations/external_tool_ascii_scratch.js";
import { withCancellationSignal } from "./progress_cancellation.js";
import { rememberLastConversion, UNDO_LAST_CONVERSION_COMMAND } from "./undo_last_conversion.js";
import { userMessage } from "./user_messages.js";

export interface ConversionCommandMessages {
  progressTitle: string;
  prepareMessage: string;
  successMessage: (count: number) => string;
  undoUnavailableMessage: (successMessage: string, reason: string) => string;
  cancelledMessage: string;
  failedMessage: (reason: string) => string;
}

export type OutputConversionFormat = "PNG" | "JPEG" | "WebP" | "AVIF" | "SVG";

export function createOutputConversionMessages(
  format: OutputConversionFormat,
  sourceCount: number,
): ConversionCommandMessages {
  return {
    progressTitle: userMessage("message.progress.convertToOutput.title", sourceCount, format),
    prepareMessage: userMessage("message.progress.prepareConversion", format),
    successMessage: (count) => userMessage("message.convertToOutput.success", count, format),
    undoUnavailableMessage: (success, reason) =>
      userMessage("message.undoUnavailable", success, reason),
    cancelledMessage: userMessage("message.convertToOutput.cancelled", format),
    failedMessage: (reason) => userMessage("message.convertToOutput.failed", format, reason),
  };
}

/** Owns progress, cancellation, Undo registration, and user notifications for output conversion. */
export async function runOutputConversion(options: {
  operationName: string;
  messages: ConversionCommandMessages;
  outputChannel?: LineOutputChannel;
  resolveConflicts?: ConversionRuntime["resolveConflicts"];
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
          return options.run({
            signal,
            ...(options.outputChannel !== undefined && { outputChannel: options.outputChannel }),
            ...(options.resolveConflicts !== undefined && {
              resolveConflicts: options.resolveConflicts,
            }),
          });
        }),
    );
    const successMessage = options.messages.successMessage(outputs.length);
    let undoId: string;

    try {
      undoId = await rememberLastConversion(outputs, options.outputChannel);
    } catch (error) {
      const reason = errorMessage(error);
      options.outputChannel?.appendLine(`[${options.operationName}] Undo record failed: ${reason}`);
      await vscode.window.showWarningMessage(
        options.messages.undoUnavailableMessage(successMessage, reason),
      );
      return;
    }

    const undoAction = userMessage("message.action.undo");
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

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
