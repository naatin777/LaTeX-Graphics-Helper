import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument } from "pdf-lib";
import * as vscode from "vscode";

import { getWebviewHtml } from "../presentation/webview/get_webview_html.js";
import { assertExistingPathInWorkspace } from "../security/workspace_path.js";

export const CROP_PDF_CONFIGURE_COMMAND = "latex-graphics-helper.cropPdf.configure";

export async function cropPdfConfigureCommand(
  context: vscode.ExtensionContext,
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
): Promise<void> {
  const inputUri = resolveSinglePdfUri(uri, uris);
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(inputUri);

  if (!workspaceFolder) {
    throw new Error("cropPdf.configure input must be inside the workspace.");
  }

  await assertExistingPathInWorkspace(inputUri.fsPath, workspaceFolder.uri.fsPath);

  const pdf = await PDFDocument.load(await readFile(inputUri.fsPath));
  const panel = vscode.window.createWebviewPanel(
    "latex-graphics-helper.cropPdf.configure",
    `Crop PDF: ${path.basename(inputUri.fsPath)}`,
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, "media", "webview", "crop_pdf"),
        vscode.Uri.file(path.dirname(inputUri.fsPath)),
      ],
    },
  );

  panel.webview.html = getWebviewHtml({
    webview: panel.webview,
    extensionUri: context.extensionUri,
    title: "Crop PDF",
    appName: "crop_pdf",
  });

  panel.webview.onDidReceiveMessage((message: unknown) => {
    if (!isCropConfigureMessage(message)) {
      return;
    }

    if (message.type === "cancel") {
      panel.dispose();
      return;
    }

    void vscode.window.showInformationMessage("cropPdf.configure output is not implemented yet.");
  });

  await panel.webview.postMessage({
    type: "init",
    payload: {
      pdfSrc: panel.webview.asWebviewUri(inputUri).toString(),
      fileName: path.basename(inputUri.fsPath),
      pageCount: pdf.getPageCount(),
      initialPage: 1,
    },
  });
}

function resolveSinglePdfUri(uri?: vscode.Uri, uris?: vscode.Uri[]): vscode.Uri {
  const candidates = uris && uris.length > 0 ? uris : uri ? [uri] : [];

  if (candidates.length !== 1) {
    throw new Error("cropPdf.configure requires exactly one PDF file.");
  }

  const inputUri = candidates[0];

  if (!inputUri) {
    throw new Error("cropPdf.configure requires exactly one PDF file.");
  }

  if (inputUri.scheme !== "file") {
    throw new Error("cropPdf.configure supports only local file URI.");
  }

  if (path.extname(inputUri.fsPath).toLowerCase() !== ".pdf") {
    throw new Error("cropPdf.configure supports only PDF files.");
  }

  return inputUri;
}

function isCropConfigureMessage(
  message: unknown,
): message is { type: "apply" | "cancel"; payload?: unknown } {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    (message.type === "apply" || message.type === "cancel")
  );
}
