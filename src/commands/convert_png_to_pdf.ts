import * as vscode from "vscode";
import path from "node:path";

import { convertPngToPdf } from "../operations/convert_png_to_pdf.js";
import { resolveOutputPath } from "../config/resolve_output_path.js";

export const CONVERT_PNG_TO_PDF_COMMAND = "latex-graphics-helper.convertPngToPdf";

export async function convertPngToPdfCommand(uri?: vscode.Uri, uris?: vscode.Uri[]): Promise<void> {
  const sourceUris = uris && uris.length > 0 ? uris : uri ? [uri] : [];

  if (sourceUris.length === 0) {
    throw new Error("No PNG files were selected.");
  }

  const configuration = vscode.workspace.getConfiguration("latex-graphics-helper");
  const outputTemplate =
    configuration.get<string>("outputPath.convertPngToPdf") ||
    "${fileDirname}/${fileBasenameNoExtension}.pdf";

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error("No workspace folder found.");
  }

  const workspacePath = workspaceFolder.uri.fsPath;

  for (const sourceUri of sourceUris) {
    const outputPath = resolveOutputPath(outputTemplate, {
      sourcePath: sourceUri.fsPath,
      workspacePath,
      workspaceName: path.basename(workspacePath),
    });

    await convertPngToPdf({
      sourcePath: sourceUri.fsPath,
      outputPath,
      workspacePath,
    });

    vscode.window.showInformationMessage(`Converted PNG to PDF: ${outputPath}`);
  }
}
