import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument } from 'pdf-lib';
import * as vscode from 'vscode';

import {
  isSplitPdfWebviewToHostMessage,
  type SplitPdfHostToWebview,
  type SplitPdfPageGroupRow,
} from '../../application/protocols/split_pdf_protocol.js';
import { resolveOutputPath } from '../../config/output/resolve_output_path.js';
import { localeMap } from '../../locale_map.js';
import { splitPdfAllPages, splitPdfByPageGroups, type SplitPdfJob } from '../../operations/pdf/split_pdf.js';
import type { LineOutputChannel } from '../../operations/external_tools/external_tool_ascii_scratch.js';
import { getWebviewHtml } from '../../presentation/webview/get_webview_html.js';
import { assertExistingPathInWorkspace, assertWritablePathInWorkspace } from '../../security/workspace_path.js';

import type { CommandDependencies } from '../shared/command_dependencies.js';
import { withCancellationSignal } from '../lifecycle/progress_cancellation.js';
import { resolveOutputConflicts } from '../lifecycle/safe_mode.js';
import { rememberLastConversion, UNDO_LAST_CONVERSION_COMMAND } from '../lifecycle/undo_last_conversion.js';
import { userMessage } from '../shared/user_messages.js';

const DEFAULT_OUTPUT_PATH = '${fileDirname}/${fileBasenameNoExtension}/${page}.pdf';
export const SPLIT_PDF_ALL_PAGES_COMMAND = 'latex-graphics-helper.splitPdf.allPages';
export const SPLIT_PDF_CONFIGURE_COMMAND = 'latex-graphics-helper.splitPdf.configure';

export async function splitPdfAllPagesCommand(
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
  dependencies?: CommandDependencies,
): Promise<void> {
  const outputChannel = dependencies?.outputChannel;
  try {
    const sourceUris = selectedUris(uri, uris);

    if (sourceUris.length === 0) {
      throw new Error('No PDF files were selected.');
    }

    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    const outputTemplate = configuration.get<string>('outputPath.splitPdf', DEFAULT_OUTPUT_PATH);
    const jobs = sourceUris.map((sourceUri) => createJob(sourceUri, outputTemplate));
    const outputs = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: userMessage('message.progress.splitPdf.title', jobs.length),
        cancellable: true,
      },
      async (progress, token) => {
        return withCancellationSignal(token, async (signal) => {
          progress.report({ message: userMessage('message.progress.preparePdfSplit') });
          return splitPdfAllPages({
            jobs,
            signal,
            resolveOutputConflicts,
            ...(outputChannel !== undefined && { outputChannel }),
          });
        });
      },
    );

    const successMessage = userMessage('message.splitPdf.success', outputs.length);
    let undoId: string;

    try {
      undoId = await rememberLastConversion(outputs, outputChannel);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await vscode.window.showWarningMessage(userMessage('message.undoUnavailable', successMessage, message));
      return;
    }

    const undoAction = userMessage('message.action.undo');
    const selectedAction = await vscode.window.showInformationMessage(successMessage, undoAction);

    if (selectedAction === undoAction) {
      await vscode.commands.executeCommand(UNDO_LAST_CONVERSION_COMMAND, undoId);
    }
  } catch (error) {
    if (isAbortError(error)) {
      await vscode.window.showInformationMessage(userMessage('message.splitPdf.cancelled'));
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(userMessage('message.splitPdf.failed', message));
  }
}

function selectedUris(uri?: vscode.Uri, uris?: vscode.Uri[]): vscode.Uri[] {
  const candidates = uris && uris.length > 0 ? uris : uri ? [uri] : [];
  const uniqueUris = new Map(candidates.map((candidate) => [candidate.toString(), candidate]));

  return [...uniqueUris.values()];
}

function createJob(sourceUri: vscode.Uri, outputTemplate: string): SplitPdfJob {
  if (sourceUri.scheme !== 'file') {
    throw new Error(`Only local PDF files are supported: ${sourceUri.toString()}`);
  }

  const workspace = vscode.workspace.getWorkspaceFolder(sourceUri);

  if (!workspace) {
    throw new Error(`The PDF must be inside an open workspace: ${sourceUri.fsPath}`);
  }

  const sourcePath = sourceUri.fsPath;

  if (path.extname(sourcePath).toLowerCase() !== '.pdf') {
    throw new Error(`Only PDF files can be split: ${sourcePath}`);
  }

  return {
    sourcePath,
    workspacePath: workspace.uri.fsPath,
    outputPathForPage: (page) =>
      resolveOutputPath(outputTemplate, {
        workspacePath: workspace.uri.fsPath,
        workspaceName: workspace.name,
        sourcePath,
        page: page.toString(),
      }),
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export async function splitPdfConfigureCommand(
  context: vscode.ExtensionContext,
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
  dependencies?: CommandDependencies,
): Promise<void> {
  const outputChannel = dependencies?.outputChannel;

  try {
    await runSplitPdfConfigureCommand(context, uri, uris, outputChannel);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    outputChannel?.appendLine(`[split-pdf-configure] failure: ${message}`);
    if (isAbortError(error)) {
      await vscode.window.showInformationMessage(userMessage('message.splitPdf.cancelled'));
      return;
    }

    await vscode.window.showErrorMessage(userMessage('message.splitPdf.failed', message));
  }
}

async function runSplitPdfConfigureCommand(
  context: vscode.ExtensionContext,
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
  outputChannel?: LineOutputChannel,
): Promise<void> {
  const inputUri = resolveSinglePdfUri(uri, uris);
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(inputUri);

  if (!workspaceFolder) {
    throw new Error('splitPdf.configure input must be inside the workspace.');
  }

  await assertExistingPathInWorkspace(inputUri.fsPath, workspaceFolder.uri.fsPath);
  const pdf = await PDFDocument.load(await readFile(inputUri.fsPath));
  const pageCount = pdf.getPageCount();

  if (pageCount === 0) {
    throw new Error(`PDF has no pages: ${inputUri.fsPath}`);
  }

  const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
  const outputTemplate = configuration.get<string>('outputPath.splitPdf', DEFAULT_OUTPUT_PATH);

  if (!outputTemplate.includes('${page}')) {
    throw new Error('outputPath.splitPdf must contain ${page} for splitPdf.configure.');
  }

  const outputPathTemplate = createOutputPathPreviewTemplate(outputTemplate, inputUri, workspaceFolder);

  const panelTitle = localeMap('submenu.splitPdf');
  const appRoot = vscode.Uri.joinPath(context.extensionUri, 'media', 'webview', 'split_pdf');
  const panel = vscode.window.createWebviewPanel(SPLIT_PDF_CONFIGURE_COMMAND, panelTitle, vscode.ViewColumn.Active, {
    enableScripts: true,
    localResourceRoots: [appRoot, vscode.Uri.file(path.dirname(inputUri.fsPath))],
  });
  const initMessage: SplitPdfHostToWebview = {
    type: 'init',
    payload: {
      sourceId: 'source-1',
      fileName: path.basename(inputUri.fsPath),
      pageCount,
      pdfSrc: panel.webview.asWebviewUri(inputUri).toString(),
      outputPathTemplate,
      workerSrc: panel.webview.asWebviewUri(vscode.Uri.joinPath(appRoot, 'pdf.worker.mjs')).toString(),
      cMapUrl: toWebviewDirectoryUri(panel.webview, appRoot, 'cmaps'),
      standardFontDataUrl: toWebviewDirectoryUri(panel.webview, appRoot, 'standard_fonts'),
      wasmUrl: toWebviewDirectoryUri(panel.webview, appRoot, 'wasm'),
      labels: splitPdfLabels(),
    },
  };

  panel.webview.html = getWebviewHtml({
    webview: panel.webview,
    extensionUri: context.extensionUri,
    title: panelTitle,
    appName: 'split_pdf',
    locale: vscode.env.language,
  });

  let isApplying = false;
  panel.webview.onDidReceiveMessage((message: unknown) => {
    if (!isSplitPdfWebviewToHostMessage(message)) {
      return;
    }

    if (message.type === 'ready') {
      // VS Code Webview.postMessage has no browser targetOrigin parameter.
      void panel.webview.postMessage(initMessage);
      return;
    }

    if (message.type === 'cancel') {
      panel.dispose();
      return;
    }

    if (message.type === 'previewLoadFailed') {
      outputChannel?.appendLine(`[split-pdf-configure] preview failure: ${message.payload.message}`);
      return;
    }

    if (isApplying) {
      return;
    }

    isApplying = true;
    void applyConfiguredSplit({
      inputUri,
      workspaceFolder,
      outputTemplate,
      pageCount,
      rows: message.payload.rows,
      panel,
      ...(outputChannel !== undefined && { outputChannel }),
    }).finally(() => {
      isApplying = false;
    });
  });
}

async function applyConfiguredSplit(params: {
  inputUri: vscode.Uri;
  workspaceFolder: vscode.WorkspaceFolder;
  outputTemplate: string;
  pageCount: number;
  rows: SplitPdfPageGroupRow[];
  panel: vscode.WebviewPanel;
  outputChannel?: LineOutputChannel;
}): Promise<void> {
  const { inputUri, workspaceFolder, outputTemplate, pageCount, rows, panel, outputChannel } = params;
  const abortController = new AbortController();
  let panelDisposed = false;
  const panelDisposeSubscription = panel.onDidDispose(() => {
    panelDisposed = true;
    abortController.abort();
  });

  try {
    validateConfiguredRows(rows, pageCount);
    if (!outputTemplate.includes('${page}')) {
      throw new Error('outputPath.splitPdf must contain ${page} for splitPdf.configure.');
    }

    const sourcePath = inputUri.fsPath;
    const workspacePath = workspaceFolder.uri.fsPath;
    const outputContext = {
      workspacePath,
      workspaceName: workspaceFolder.name,
      sourcePath,
    };

    for (const row of rows) {
      const outputPath = resolveOutputPath(outputTemplate, { ...outputContext, page: row.outputName });
      await assertWritablePathInWorkspace(outputPath, workspacePath);
    }

    abortController.signal.throwIfAborted();
    if (panelDisposed) {
      return;
    }

    const outputs = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: userMessage('message.progress.splitPdf.title', 1),
        cancellable: true,
      },
      async (progress, token) => {
        const cancellationSubscription = token.onCancellationRequested(() => abortController.abort());

        try {
          if (token.isCancellationRequested) {
            abortController.abort();
          }

          progress.report({ message: userMessage('message.progress.preparePdfSplit') });
          return await splitPdfByPageGroups({
            jobs: [
              {
                sourcePath,
                workspacePath,
                pageGroups: rows.map((row) => row.pages),
                outputPathForGroup: (groupIndex) => {
                  const row = rows[groupIndex];

                  if (!row) {
                    throw new Error(`No output name was supplied for group ${groupIndex}.`);
                  }

                  return resolveOutputPath(outputTemplate, { ...outputContext, page: row.outputName });
                },
              },
            ],
            signal: abortController.signal,
            resolveOutputConflicts,
            ...(outputChannel !== undefined && { outputChannel }),
          });
        } finally {
          cancellationSubscription.dispose();
        }
      },
    );

    const successMessage = userMessage('message.splitPdf.success', outputs.length);
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
    const selectedAction = await vscode.window.showInformationMessage(successMessage, undoAction);

    if (selectedAction === undoAction) {
      await vscode.commands.executeCommand(UNDO_LAST_CONVERSION_COMMAND, undoId);
    }

    panel.dispose();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    outputChannel?.appendLine(`[split-pdf-configure] failure: ${message}`);
    if (isAbortError(error)) {
      await vscode.window.showInformationMessage(userMessage('message.splitPdf.cancelled'));
      return;
    }

    await vscode.window.showErrorMessage(userMessage('message.splitPdf.failed', message));
  } finally {
    panelDisposeSubscription.dispose();
  }
}

function resolveSinglePdfUri(uri?: vscode.Uri, uris?: vscode.Uri[]): vscode.Uri {
  const candidates = uris && uris.length > 0 ? uris : uri ? [uri] : [];

  if (candidates.length !== 1) {
    throw new Error('splitPdf.configure requires exactly one PDF file.');
  }

  const inputUri = candidates[0];

  if (!inputUri) {
    throw new Error('splitPdf.configure requires exactly one PDF file.');
  }

  if (inputUri.scheme !== 'file') {
    throw new Error('splitPdf.configure supports only local file URI.');
  }

  if (path.extname(inputUri.fsPath).toLowerCase() !== '.pdf') {
    throw new Error('splitPdf.configure supports only PDF files.');
  }

  return inputUri;
}

function validateConfiguredRows(rows: readonly SplitPdfPageGroupRow[], pageCount: number): void {
  if (rows.length === 0) {
    throw new Error('At least one PDF page group is required.');
  }

  const outputNames = new Set<string>();

  for (const [groupIndex, row] of rows.entries()) {
    if (row.pages.length === 0) {
      throw new Error(`Page group ${groupIndex + 1} cannot be empty.`);
    }

    for (const page of row.pages) {
      if (!Number.isInteger(page) || page < 1 || page > pageCount) {
        throw new Error(`Page ${page} in group ${groupIndex + 1} is out of range.`);
      }
    }

    if (row.outputName.trim().length === 0) {
      throw new Error(`Output name for group ${groupIndex + 1} cannot be empty.`);
    }

    if (row.outputName.includes('\u0000') || /[\\/]/.test(row.outputName) || row.outputName.includes('..')) {
      throw new Error(`Output name for group ${groupIndex + 1} must be a file name without path separators or .. .`);
    }

    if (outputNames.has(row.outputName)) {
      throw new Error(`Output name is duplicated: ${row.outputName}`);
    }

    outputNames.add(row.outputName);
  }
}

function createOutputPathPreviewTemplate(
  outputTemplate: string,
  inputUri: vscode.Uri,
  workspaceFolder: vscode.WorkspaceFolder,
): string {
  const marker = '__LGH_OUTPUT_NAME__';
  const outputPath = resolveOutputPath(outputTemplate, {
    workspacePath: workspaceFolder.uri.fsPath,
    workspaceName: workspaceFolder.name,
    sourcePath: inputUri.fsPath,
    page: marker,
  });
  const relativePath = path.relative(workspaceFolder.uri.fsPath, outputPath);

  return relativePath.length > 0 ? relativePath : path.basename(outputPath);
}

function toWebviewDirectoryUri(webview: vscode.Webview, appRoot: vscode.Uri, directoryName: string): string {
  return `${webview.asWebviewUri(vscode.Uri.joinPath(appRoot, directoryName)).toString()}/`;
}

function splitPdfLabels() {
  return {
    title: localeMap('webview.splitPdf.title'),
    description: localeMap('webview.splitPdf.description'),
    preview: localeMap('webview.splitPdf.preview'),
    previewDescription: localeMap('webview.splitPdf.previewDescription'),
    previewAriaLabel: localeMap('webview.splitPdf.previewAriaLabel'),
    groups: localeMap('webview.splitPdf.groups'),
    groupLabel: localeMap('webview.splitPdf.groupLabel'),
    pages: localeMap('webview.splitPdf.pages'),
    pageLabel: localeMap('webview.splitPdf.pageLabel'),
    pagesPlaceholder: localeMap('webview.splitPdf.pagesPlaceholder'),
    outputName: localeMap('webview.splitPdf.outputName'),
    outputNamePlaceholder: localeMap('webview.splitPdf.outputNamePlaceholder'),
    outputPath: localeMap('webview.splitPdf.outputPath'),
    addGroup: localeMap('webview.splitPdf.addGroup'),
    removeGroup: localeMap('webview.splitPdf.removeGroup'),
    apply: localeMap('webview.splitPdf.apply'),
    cancel: localeMap('webview.splitPdf.cancel'),
    previewRenderError: localeMap('webview.splitPdf.previewRenderError'),
    previewApplyError: localeMap('webview.splitPdf.previewApplyError'),
    pagesRequiredError: localeMap('webview.splitPdf.pagesRequiredError'),
    pageWholeNumberError: localeMap('webview.splitPdf.pageWholeNumberError'),
    pageOutOfRangeError: localeMap('webview.splitPdf.pageOutOfRangeError'),
    allPages: localeMap('webview.splitPdf.allPages'),
    focusedPages: localeMap('webview.splitPdf.focusedPages'),
    zoom: localeMap('webview.splitPdf.zoom'),
    dragGroup: localeMap('webview.splitPdf.dragGroup'),
    moveUp: localeMap('webview.splitPdf.moveUp'),
    moveDown: localeMap('webview.splitPdf.moveDown'),
    outputOrder: localeMap('webview.splitPdf.outputOrder'),
    invalidPages: localeMap('webview.splitPdf.invalidPages'),
    descendingPages: localeMap('webview.splitPdf.descendingPages'),
    outputNameEmpty: localeMap('webview.splitPdf.outputNameEmpty'),
    outputNamePath: localeMap('webview.splitPdf.outputNamePath'),
    outputNameDuplicate: localeMap('webview.splitPdf.outputNameDuplicate'),
  };
}
