import * as vscode from "vscode";

import {
  createConversionUndoRecord,
  type ConversionOutput,
  type ConversionUndoRecord,
  undoConversionOutputs,
} from "../operations/undo_last_conversion.js";
import { userMessage } from "./user_messages.js";

export const UNDO_LAST_CONVERSION_COMMAND = "latex-graphics-helper.undoLastConversion";

let lastConversion: ConversionUndoRecord | undefined;

export async function rememberLastConversion(outputs: ConversionOutput[]): Promise<string> {
  const record = await createConversionUndoRecord(outputs);
  lastConversion = record;
  return record.id;
}

export async function undoLastConversion(expectedId?: string): Promise<void> {
  try {
    if (!lastConversion) {
      await vscode.window.showInformationMessage(userMessage("message.undo.none"));
      return;
    }

    if (expectedId && expectedId !== lastConversion.id) {
      await vscode.window.showWarningMessage(userMessage("message.undo.newerConversionCompleted"));
      return;
    }

    await undoConversionOutputs(lastConversion);
    lastConversion = undefined;
    await vscode.window.showInformationMessage(userMessage("message.undo.removedLastOutput"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(userMessage("message.undo.failed", message));
  }
}
