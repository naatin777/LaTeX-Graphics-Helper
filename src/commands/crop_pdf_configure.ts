import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument } from "pdf-lib";
import * as vscode from "vscode";

import { resolveOutputPath } from "../config/resolve_output_path.js";
import {
  cropPdfWithConfiguredBox,
  type CropBox,
  type CropTarget,
} from "../operations/crop_pdf_configure.js";
import { getWebviewHtml } from "../presentation/webview/get_webview_html.js";
import { assertExistingPathInWorkspace } from "../security/workspace_path.js";
import { withCancellationSignal } from "./progress_cancellation.js";
import { resolveOutputConflicts } from "./safe_mode.js";
import { rememberLastConversion, UNDO_LAST_CONVERSION_COMMAND } from "./undo_last_conversion.js";
import { userMessage } from "./user_messages.js";

export const CROP_PDF_CONFIGURE_COMMAND = "latex-graphics-helper.cropPdf.configure";
const DEFAULT_OUTPUT_PATH = "${fileDirname}/${fileBasenameNoExtension}-crop.pdf";

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
  const firstPage = pdf.getPages()[0];
  const firstPageMediaBox = firstPage?.getMediaBox();
  const configuration = vscode.workspace.getConfiguration("latex-graphics-helper");
  const outputTemplate = configuration.get<string>("outputPath.cropPdf", DEFAULT_OUTPUT_PATH);
  const initMessage = {
    type: "init",
    payload: {
      pdfSrc: "",
      workerSrc: "",
      fileName: path.basename(inputUri.fsPath),
      pageCount: pdf.getPageCount(),
      initialPage: 1,
      width: firstPageMediaBox?.width ?? 0,
      height: firstPageMediaBox?.height ?? 0,
    },
  };
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
  let isApplying = false;

  panel.webview.html = getWebviewHtml({
    webview: panel.webview,
    extensionUri: context.extensionUri,
    title: "Crop PDF",
    appName: "crop_pdf",
  });
  initMessage.payload.pdfSrc = panel.webview.asWebviewUri(inputUri).toString();
  initMessage.payload.workerSrc = panel.webview
    .asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, "media", "webview", "crop_pdf", "pdf.worker.mjs"),
    )
    .toString();

  panel.webview.onDidReceiveMessage((message: unknown) => {
    if (!isCropConfigureMessage(message)) {
      return;
    }

    if (message.type === "ready") {
      void panel.webview.postMessage(initMessage);
      return;
    }

    if (message.type === "cancel") {
      panel.dispose();
      return;
    }

    if (isApplying) {
      return;
    }

    isApplying = true;
    void applyConfiguredCrop({
      inputUri,
      workspaceFolder,
      outputTemplate,
      cropBox: message.payload.cropBox,
      target: message.payload.target,
      panel,
    }).finally(() => {
      isApplying = false;
    });
  });
}

async function applyConfiguredCrop(params: {
  inputUri: vscode.Uri;
  workspaceFolder: vscode.WorkspaceFolder;
  outputTemplate: string;
  cropBox: CropBox;
  target: CropTarget;
  panel: vscode.WebviewPanel;
}): Promise<void> {
  try {
    const { inputUri, workspaceFolder, outputTemplate, cropBox, target, panel } = params;
    const sourcePath = inputUri.fsPath;
    const outputPath = resolveOutputPath(outputTemplate, {
      workspacePath: workspaceFolder.uri.fsPath,
      workspaceName: workspaceFolder.name,
      sourcePath,
    });

    const outputs = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: userMessage("message.progress.cropPdf.title", 1),
        cancellable: true,
      },
      async (progress, token) =>
        withCancellationSignal(token, async (signal) => {
          progress.report({ message: userMessage("message.progress.prepareConversion", "PDF") });
          return cropPdfWithConfiguredBox({
            job: {
              sourcePath,
              workspacePath: workspaceFolder.uri.fsPath,
              outputPath,
              cropBox,
              target,
            },
            signal,
            resolveOutputConflicts,
          });
        }),
    );

    const successMessage = userMessage("message.cropPdf.success", outputs.length);
    let undoId: string;

    try {
      undoId = await rememberLastConversion(outputs);
    } catch (error) {
      panel.dispose();
      const message = error instanceof Error ? error.message : String(error);
      await vscode.window.showWarningMessage(
        userMessage("message.undoUnavailable", successMessage, message),
      );
      return;
    }

    const undoAction = userMessage("message.action.undo");
    panel.dispose();
    const selectedAction = await vscode.window.showInformationMessage(successMessage, undoAction);

    if (selectedAction === undoAction) {
      await vscode.commands.executeCommand(UNDO_LAST_CONVERSION_COMMAND, undoId);
    }
  } catch (error) {
    if (isAbortError(error)) {
      await vscode.window.showInformationMessage(userMessage("message.cropPdf.cancelled"));
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(userMessage("message.cropPdf.failed", message));
  }
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
): message is
  | { type: "ready" }
  | { type: "cancel" }
  | { type: "apply"; payload: { cropBox: CropBox; target: CropTarget } } {
  if (typeof message !== "object" || message === null || !("type" in message)) {
    return false;
  }

  if (message.type === "ready" || message.type === "cancel") {
    return true;
  }

  if (message.type !== "apply" || !("payload" in message)) {
    return false;
  }

  const payload = message.payload;

  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  if (!("cropBox" in payload) || !("target" in payload)) {
    return false;
  }

  return isCropBox(payload.cropBox) && isCropTarget(payload.target);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function isCropBox(value: unknown): value is CropBox {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "left" in value &&
    typeof value.left === "number" &&
    "bottom" in value &&
    typeof value.bottom === "number" &&
    "right" in value &&
    typeof value.right === "number" &&
    "top" in value &&
    typeof value.top === "number"
  );
}

function isCropTarget(value: unknown): value is CropTarget {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }

  if (value.type === "all") {
    return true;
  }

  if (value.type !== "selected" || !("pages" in value) || !Array.isArray(value.pages)) {
    return false;
  }

  return value.pages.every((page) => typeof page === "number");
}
