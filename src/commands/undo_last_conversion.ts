import * as vscode from "vscode";

import {
  createConversionUndoRecord,
  type ConversionOutput,
  type ConversionUndoRecord,
  undoConversionOutputs,
} from "../operations/undo_last_conversion.js";

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
      await vscode.window.showInformationMessage("There is no conversion to undo.");
      return;
    }

    if (expectedId && expectedId !== lastConversion.id) {
      await vscode.window.showWarningMessage(
        "A newer conversion has completed. The older conversion was not removed.",
      );
      return;
    }

    await undoConversionOutputs(lastConversion);
    lastConversion = undefined;
    await vscode.window.showInformationMessage("Removed the last conversion output.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(`Could not undo the last conversion: ${message}`);
  }
}
