import * as vscode from "vscode";

import { cropPdfAuto } from "./commands/crop_pdf_auto.js";
import {
  convertToPdfCommand,
  convertPngToPdfCommand,
  CONVERT_TO_PDF_COMMAND,
  CONVERT_PNG_TO_PDF_COMMAND,
} from "./commands/convert_png_to_pdf.js";
import { initializeSafeMode } from "./commands/safe_mode.js";
import { splitPdfAllPagesCommand } from "./commands/split_pdf_all_pages.js";
import {
  undoLastConversion,
  UNDO_LAST_CONVERSION_COMMAND,
} from "./commands/undo_last_conversion.js";

export function activate(context: vscode.ExtensionContext) {
  initializeSafeMode(context);

  context.subscriptions.push(
    vscode.commands.registerCommand("latex-graphics-helper.cropPdf.auto", cropPdfAuto),
    vscode.commands.registerCommand(
      "latex-graphics-helper.splitPdf.allPages",
      splitPdfAllPagesCommand,
    ),
    vscode.commands.registerCommand(UNDO_LAST_CONVERSION_COMMAND, undoLastConversion),
    vscode.commands.registerCommand(CONVERT_TO_PDF_COMMAND, convertToPdfCommand),
    vscode.commands.registerCommand(CONVERT_PNG_TO_PDF_COMMAND, convertPngToPdfCommand),
  );
}

export function deactivate() {}
