import * as vscode from "vscode";

import { cropPdfAuto } from "./commands/crop_pdf_auto.js";
import { convertToJpegCommand, CONVERT_TO_JPEG_COMMAND } from "./commands/convert_to_jpeg.js";
import { convertToPngCommand, CONVERT_TO_PNG_COMMAND } from "./commands/convert_to_png.js";
import { convertToSvgCommand, CONVERT_TO_SVG_COMMAND } from "./commands/convert_to_svg.js";
import { convertToWebpCommand, CONVERT_TO_WEBP_COMMAND } from "./commands/convert_to_webp.js";
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
    vscode.commands.registerCommand(
      CONVERT_TO_PNG_COMMAND,
      (uri?: vscode.Uri, uris?: vscode.Uri[]) => convertToPngCommand(uri, uris),
    ),
    vscode.commands.registerCommand(
      CONVERT_TO_JPEG_COMMAND,
      (uri?: vscode.Uri, uris?: vscode.Uri[]) => convertToJpegCommand(uri, uris),
    ),
    vscode.commands.registerCommand(
      CONVERT_TO_WEBP_COMMAND,
      (uri?: vscode.Uri, uris?: vscode.Uri[]) => convertToWebpCommand(uri, uris),
    ),
    vscode.commands.registerCommand(
      CONVERT_TO_SVG_COMMAND,
      (uri?: vscode.Uri, uris?: vscode.Uri[]) => convertToSvgCommand(uri, uris),
    ),
    vscode.commands.registerCommand(CONVERT_PNG_TO_PDF_COMMAND, convertPngToPdfCommand),
  );
}

export function deactivate() {}
