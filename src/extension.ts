import * as vscode from "vscode";

import { cropPdfAuto } from "./commands/crop_pdf_auto.js";
import { splitPdfAllPagesCommand } from "./commands/split_pdf_all_pages.js";
import {
  undoLastConversion,
  UNDO_LAST_CONVERSION_COMMAND,
} from "./commands/undo_last_conversion.js";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("latex-graphics-helper.cropPdf.auto", cropPdfAuto),
    vscode.commands.registerCommand(
      "latex-graphics-helper.splitPdf.allPages",
      splitPdfAllPagesCommand,
    ),
    vscode.commands.registerCommand(UNDO_LAST_CONVERSION_COMMAND, undoLastConversion),
  );
}

export function deactivate() {}
