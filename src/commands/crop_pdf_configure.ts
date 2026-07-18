import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument } from 'pdf-lib';
import * as vscode from 'vscode';

import {
  type CropBox,
  type CropConfigureHostToWebview,
  type CropTarget,
  isCropConfigureMessage,
} from '../application/crop_pdf_protocol.js';
import { resolveOutputPath } from '../config/resolve_output_path.js';
import { localeMap } from '../locale_map.js';
import { cropPdfWithConfiguredBox } from '../operations/crop_pdf_configure.js';
import type { LineOutputChannel } from '../operations/external_tool_ascii_scratch.js';
import { getWebviewHtml } from '../presentation/webview/get_webview_html.js';
import { assertExistingPathInWorkspace } from '../security/workspace_path.js';

import type { CommandDependencies } from './command_dependencies.js';
import { withCancellationSignal } from './progress_cancellation.js';
import { resolveOutputConflicts } from './safe_mode.js';
import { rememberLastConversion, UNDO_LAST_CONVERSION_COMMAND } from './undo_last_conversion.js';
import { userMessage } from './user_messages.js';

export const CROP_PDF_CONFIGURE_COMMAND = 'latex-graphics-helper.cropPdf.configure';
const DEFAULT_OUTPUT_PATH = '${fileDirname}/${fileBasenameNoExtension}-crop.pdf';

export async function cropPdfConfigureCommand(
  context: vscode.ExtensionContext,
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
  dependencies?: CommandDependencies,
): Promise<void> {
  const outputChannel = dependencies?.outputChannel;
  try {
    await runCropPdfConfigureCommand(context, uri, uris, outputChannel);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    outputChannel?.appendLine(`[crop-pdf-configure] failure: ${message}`);
    if (isAbortError(error)) {
      await vscode.window.showInformationMessage(userMessage('message.cropPdf.cancelled'));
      return;
    }
    await vscode.window.showErrorMessage(userMessage('message.cropPdf.failed', message));
  }
}

async function runCropPdfConfigureCommand(
  context: vscode.ExtensionContext,
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
  outputChannel?: LineOutputChannel,
): Promise<void> {
  const inputUri = resolveSinglePdfUri(uri, uris);
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(inputUri);

  if (!workspaceFolder) {
    throw new Error('cropPdf.configure input must be inside the workspace.');
  }

  await assertExistingPathInWorkspace(inputUri.fsPath, workspaceFolder.uri.fsPath);

  const pdf = await PDFDocument.load(await readFile(inputUri.fsPath));
  const firstPage = pdf.getPages()[0];
  const firstPageMediaBox = firstPage?.getMediaBox();
  const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
  const outputTemplate = configuration.get<string>('outputPath.cropPdf', DEFAULT_OUTPUT_PATH);
  const initMessage: CropConfigureHostToWebview = {
    type: 'init',
    payload: {
      pdfSrc: '',
      workerSrc: '',
      cMapUrl: '',
      standardFontDataUrl: '',
      wasmUrl: '',
      fileName: path.basename(inputUri.fsPath),
      pageCount: pdf.getPageCount(),
      initialPage: 1,
      width: firstPageMediaBox?.width ?? 0,
      height: firstPageMediaBox?.height ?? 0,
      labels: cropPdfLabels(),
    },
  };
  const panel = vscode.window.createWebviewPanel(
    'latex-graphics-helper.cropPdf.configure',
    `Crop PDF: ${path.basename(inputUri.fsPath)}`,
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'media', 'webview', 'crop_pdf'),
        vscode.Uri.file(path.dirname(inputUri.fsPath)),
      ],
    },
  );
  let isApplying = false;

  panel.webview.html = getWebviewHtml({
    webview: panel.webview,
    extensionUri: context.extensionUri,
    title: 'Crop PDF',
    appName: 'crop_pdf',
    locale: vscode.env.language,
  });
  initMessage.payload.pdfSrc = panel.webview.asWebviewUri(inputUri).toString();
  initMessage.payload.workerSrc = panel.webview
    .asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'webview', 'crop_pdf', 'pdf.worker.mjs'))
    .toString();
  initMessage.payload.cMapUrl = toWebviewDirectoryUri(panel.webview, context.extensionUri, 'cmaps');
  initMessage.payload.standardFontDataUrl = toWebviewDirectoryUri(
    panel.webview,
    context.extensionUri,
    'standard_fonts',
  );
  initMessage.payload.wasmUrl = toWebviewDirectoryUri(panel.webview, context.extensionUri, 'wasm');

  panel.webview.onDidReceiveMessage((message: unknown) => {
    if (!isCropConfigureMessage(message)) {
      return;
    }

    if (message.type === 'ready') {
      // VS Code Webview.postMessage has no browser targetOrigin parameter.
      // oxlint-disable-next-line unicorn/require-post-message-target-origin
      void panel.webview.postMessage(initMessage);
      return;
    }

    if (message.type === 'cancel') {
      panel.dispose();
      return;
    }

    if (message.type === 'previewLoadFailed') {
      outputChannel?.appendLine(`[crop-pdf-configure] preview failure: ${message.payload.message}`);
      void vscode.window.showErrorMessage(message.payload.message);
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
      ...(outputChannel !== undefined && { outputChannel }),
    }).finally(() => {
      isApplying = false;
    });
  });
}

function toWebviewDirectoryUri(webview: vscode.Webview, extensionUri: vscode.Uri, directoryName: string): string {
  const uri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'webview', 'crop_pdf', directoryName));

  return `${uri.toString()}/`;
}

async function applyConfiguredCrop(params: {
  inputUri: vscode.Uri;
  workspaceFolder: vscode.WorkspaceFolder;
  outputTemplate: string;
  cropBox: CropBox;
  target: CropTarget;
  panel: vscode.WebviewPanel;
  outputChannel?: LineOutputChannel;
}): Promise<void> {
  try {
    const { inputUri, workspaceFolder, outputTemplate, cropBox, target, panel, outputChannel } = params;
    const sourcePath = inputUri.fsPath;
    const outputPath = resolveOutputPath(outputTemplate, {
      workspacePath: workspaceFolder.uri.fsPath,
      workspaceName: workspaceFolder.name,
      sourcePath,
    });

    const outputs = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: userMessage('message.progress.cropPdf.title', 1),
        cancellable: true,
      },
      async (progress, token) =>
        withCancellationSignal(token, async (signal) => {
          progress.report({ message: userMessage('message.progress.prepareConversion', 'PDF') });
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
            ...(outputChannel !== undefined && { outputChannel }),
          });
        }),
    );

    const successMessage = userMessage('message.cropPdf.success', outputs.length);
    let undoId: string;

    try {
      undoId = await rememberLastConversion(outputs, outputChannel);
    } catch (error) {
      panel.dispose();
      const message = error instanceof Error ? error.message : String(error);
      await vscode.window.showWarningMessage(userMessage('message.undoUnavailable', successMessage, message));
      return;
    }

    const undoAction = userMessage('message.action.undo');
    panel.dispose();
    const selectedAction = await vscode.window.showInformationMessage(successMessage, undoAction);

    if (selectedAction === undoAction) {
      await vscode.commands.executeCommand(UNDO_LAST_CONVERSION_COMMAND, undoId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    params.outputChannel?.appendLine(`[crop-pdf-configure] failure: ${message}`);
    if (isAbortError(error)) {
      await vscode.window.showInformationMessage(userMessage('message.cropPdf.cancelled'));
      return;
    }

    await vscode.window.showErrorMessage(userMessage('message.cropPdf.failed', message));
  }
}

function resolveSinglePdfUri(uri?: vscode.Uri, uris?: vscode.Uri[]): vscode.Uri {
  const candidates = uris && uris.length > 0 ? uris : uri ? [uri] : [];

  if (candidates.length !== 1) {
    throw new Error('cropPdf.configure requires exactly one PDF file.');
  }

  const inputUri = candidates[0];

  if (!inputUri) {
    throw new Error('cropPdf.configure requires exactly one PDF file.');
  }

  if (inputUri.scheme !== 'file') {
    throw new Error('cropPdf.configure supports only local file URI.');
  }

  if (path.extname(inputUri.fsPath).toLowerCase() !== '.pdf') {
    throw new Error('cropPdf.configure supports only PDF files.');
  }

  return inputUri;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function cropPdfLabels() {
  return {
    title: localeMap('webview.cropPdf.title'),
    description: localeMap('webview.cropPdf.description'),
    pageLabel: localeMap('webview.cropPdf.pageLabel'),
    pages: localeMap('webview.cropPdf.pages'),
    preview: localeMap('webview.cropPdf.preview'),
    previewDescription: localeMap('webview.cropPdf.previewDescription'),
    previewAriaLabel: localeMap('webview.cropPdf.previewAriaLabel'),
    cropSettings: localeMap('webview.cropPdf.cropSettings'),
    cropBox: localeMap('webview.cropPdf.cropBox'),
    cropBoxDescription: localeMap('webview.cropPdf.cropBoxDescription'),
    left: localeMap('webview.cropPdf.left'),
    bottom: localeMap('webview.cropPdf.bottom'),
    right: localeMap('webview.cropPdf.right'),
    top: localeMap('webview.cropPdf.top'),
    currentPageSize: localeMap('webview.cropPdf.currentPageSize'),
    targetPages: localeMap('webview.cropPdf.targetPages'),
    allPages: localeMap('webview.cropPdf.allPages'),
    selectedPages: localeMap('webview.cropPdf.selectedPages'),
    pagesInput: localeMap('webview.cropPdf.pagesInput'),
    pagesPlaceholder: localeMap('webview.cropPdf.pagesPlaceholder'),
    zoomOut: localeMap('webview.cropPdf.zoomOut'),
    zoomIn: localeMap('webview.cropPdf.zoomIn'),
    previewZoom: localeMap('webview.cropPdf.previewZoom'),
    apply: localeMap('webview.cropPdf.apply'),
    cancel: localeMap('webview.cropPdf.cancel'),
    previewRenderError: localeMap('webview.cropPdf.previewRenderError'),
    previewApplyError: localeMap('webview.cropPdf.previewApplyError'),
    cropBoxNumberError: localeMap('webview.cropPdf.cropBoxNumberError'),
    cropBoxSizeError: localeMap('webview.cropPdf.cropBoxSizeError'),
    pagesRequiredError: localeMap('webview.cropPdf.pagesRequiredError'),
    pageWholeNumberError: localeMap('webview.cropPdf.pageWholeNumberError'),
    pageOutOfRangeError: localeMap('webview.cropPdf.pageOutOfRangeError'),
  };
}
