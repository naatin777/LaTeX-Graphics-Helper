import path from 'node:path';

import * as vscode from 'vscode';

import { isMergePdfWebviewToHostMessage, type MergePdfHostToWebview } from '../application/merge_pdf_protocol.js';
import { localeMap } from '../locale_map.js';
import { mergePdf } from '../operations/merge_pdf.js';
import type { LineOutputChannel } from '../operations/external_tool_ascii_scratch.js';
import { getWebviewHtml } from '../presentation/webview/get_webview_html.js';
import { assertExistingPathInWorkspace } from '../security/workspace_path.js';

import type { CommandDependencies } from './command_dependencies.js';
import { withCancellationSignal } from './progress_cancellation.js';
import { resolveOutputConflicts } from './safe_mode.js';
import { rememberLastConversion, UNDO_LAST_CONVERSION_COMMAND } from './undo_last_conversion.js';
import { userMessage } from './user_messages.js';

export const MERGE_PDF_SELECTED_FILES_COMMAND = 'latex-graphics-helper.mergePdf.selectedFiles';
export const MERGE_PDF_CONFIGURE_COMMAND = 'latex-graphics-helper.mergePdf.configure';

export async function mergePdfSelectedFilesCommand(
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
  dependencies?: CommandDependencies,
): Promise<void> {
  const outputChannel = dependencies?.outputChannel;
  try {
    const sourceUris = selectedUris(uri, uris);

    if (sourceUris.length < 2) {
      throw new Error('Select at least two PDF files.');
    }

    const workspace = await workspaceForSources(sourceUris);
    const outputUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(path.join(workspace.uri.fsPath, 'merged.pdf')),
      filters: { PDF: ['pdf'] },
      saveLabel: 'Merge',
    });

    if (!outputUri) {
      return;
    }

    const outputs = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: userMessage('message.progress.mergePdf.title', sourceUris.length),
        cancellable: true,
      },
      async (_progress, token) => {
        return withCancellationSignal(token, async (signal) => {
          return mergePdf({
            sourcePaths: sourceUris.map((sourceUri) => sourceUri.fsPath),
            outputPath: outputUri.fsPath,
            workspacePath: workspace.uri.fsPath,
            signal,
            resolveOutputConflicts,
            ...(outputChannel !== undefined && { outputChannel }),
          });
        });
      },
    );

    const successMessage = userMessage('message.mergePdf.success', sourceUris.length);
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
      await vscode.window.showInformationMessage(userMessage('message.mergePdf.cancelled'));
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(userMessage('message.mergePdf.failed', message));
  }
}

export async function mergePdfConfigureCommand(
  context: vscode.ExtensionContext,
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
  dependencies?: CommandDependencies,
): Promise<void> {
  const outputChannel = dependencies?.outputChannel;

  try {
    const sourceUris = selectedUris(uri, uris);

    if (sourceUris.length < 2) {
      throw new Error('Select at least two PDF files.');
    }

    const workspace = await workspaceForSources(sourceUris);
    const panelTitle = localeMap('submenu.mergePdf');
    const appRoot = vscode.Uri.joinPath(context.extensionUri, 'media', 'webview', 'merge_pdf');
    const sourceById = new Map(sourceUris.map((sourceUri, index) => [`source-${index + 1}`, sourceUri]));
    const panel = vscode.window.createWebviewPanel(MERGE_PDF_CONFIGURE_COMMAND, panelTitle, vscode.ViewColumn.Active, {
      enableScripts: true,
      localResourceRoots: [appRoot, ...sourceUris.map((sourceUri) => vscode.Uri.file(path.dirname(sourceUri.fsPath)))],
    });

    panel.webview.html = getWebviewHtml({
      webview: panel.webview,
      extensionUri: context.extensionUri,
      title: panelTitle,
      appName: 'merge_pdf',
      locale: vscode.env.language,
    });

    const initMessage: MergePdfHostToWebview = {
      type: 'init',
      payload: {
        sources: sourceUris.map((sourceUri, index) => ({
          sourceId: `source-${index + 1}`,
          fileName: path.basename(sourceUri.fsPath),
          pdfSrc: panel.webview.asWebviewUri(sourceUri).toString(),
        })),
        workerSrc: panel.webview.asWebviewUri(vscode.Uri.joinPath(appRoot, 'pdf.worker.mjs')).toString(),
        cMapUrl: toWebviewDirectoryUri(panel.webview, appRoot, 'cmaps'),
        standardFontDataUrl: toWebviewDirectoryUri(panel.webview, appRoot, 'standard_fonts'),
        wasmUrl: toWebviewDirectoryUri(panel.webview, appRoot, 'wasm'),
        labels: mergePdfLabels(),
      },
    };
    let isApplying = false;

    panel.webview.onDidReceiveMessage((message: unknown) => {
      if (!isMergePdfWebviewToHostMessage(message)) {
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
        outputChannel?.appendLine(`[merge-pdf-configure] preview failure: ${message.payload.message}`);
        return;
      }

      if (isApplying) {
        return;
      }

      isApplying = true;
      void applyConfiguredMerge({
        sourceById,
        sourceIds: message.payload.sourceIds,
        workspace,
        panel,
        ...(outputChannel !== undefined && { outputChannel }),
      }).finally(() => {
        isApplying = false;
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    outputChannel?.appendLine(`[merge-pdf-configure] failure: ${message}`);
    await vscode.window.showErrorMessage(userMessage('message.mergePdf.failed', message));
  }
}

async function applyConfiguredMerge(params: {
  sourceById: ReadonlyMap<string, vscode.Uri>;
  sourceIds: string[];
  workspace: vscode.WorkspaceFolder;
  panel: vscode.WebviewPanel;
  outputChannel?: LineOutputChannel;
}): Promise<void> {
  const { sourceById, sourceIds, workspace, panel, outputChannel } = params;
  const abortController = new AbortController();
  let panelDisposed = false;
  const panelDisposeSubscription = panel.onDidDispose(() => {
    panelDisposed = true;
    abortController.abort();
  });

  try {
    const sourceUris = resolveConfiguredSources(sourceById, sourceIds);
    const outputUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(path.join(workspace.uri.fsPath, 'merged.pdf')),
      filters: { PDF: ['pdf'] },
      saveLabel: 'Merge',
    });

    if (!outputUri || panelDisposed) {
      return;
    }

    const outputs = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: userMessage('message.progress.mergePdf.title', sourceUris.length),
        cancellable: true,
      },
      async (_progress, token) => {
        const cancellationSubscription = token.onCancellationRequested(() => abortController.abort());

        try {
          if (token.isCancellationRequested) {
            abortController.abort();
          }

          return await mergePdf({
            sourcePaths: sourceUris.map((sourceUri) => sourceUri.fsPath),
            outputPath: outputUri.fsPath,
            workspacePath: workspace.uri.fsPath,
            signal: abortController.signal,
            resolveOutputConflicts,
            ...(outputChannel !== undefined && { outputChannel }),
          });
        } finally {
          cancellationSubscription.dispose();
        }
      },
    );

    const successMessage = userMessage('message.mergePdf.success', sourceUris.length);
    let undoId: string;

    try {
      undoId = await rememberLastConversion(outputs, outputChannel);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await vscode.window.showWarningMessage(userMessage('message.undoUnavailable', successMessage, message));
      panel.dispose();
      return;
    }

    const undoAction = userMessage('message.action.undo');
    const selectedAction = await vscode.window.showInformationMessage(successMessage, undoAction);

    if (selectedAction === undoAction) {
      await vscode.commands.executeCommand(UNDO_LAST_CONVERSION_COMMAND, undoId);
    }

    panel.dispose();
  } catch (error) {
    if (isAbortError(error)) {
      await vscode.window.showInformationMessage(userMessage('message.mergePdf.cancelled'));
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    outputChannel?.appendLine(`[merge-pdf-configure] failure: ${message}`);
    await vscode.window.showErrorMessage(userMessage('message.mergePdf.failed', message));
  } finally {
    panelDisposeSubscription.dispose();
  }
}

function resolveConfiguredSources(sourceById: ReadonlyMap<string, vscode.Uri>, sourceIds: string[]): vscode.Uri[] {
  if (sourceIds.length < 2) {
    throw new Error('Select at least two PDF files.');
  }

  const resolvedUris: vscode.Uri[] = [];
  const seenIds = new Set<string>();

  for (const sourceId of sourceIds) {
    if (seenIds.has(sourceId)) {
      throw new Error('Each PDF can only be selected once.');
    }

    const sourceUri = sourceById.get(sourceId);

    if (!sourceUri) {
      throw new Error('The PDF selection contains an unknown source.');
    }

    seenIds.add(sourceId);
    resolvedUris.push(sourceUri);
  }

  return resolvedUris;
}

function toWebviewDirectoryUri(webview: vscode.Webview, appRoot: vscode.Uri, directoryName: string): string {
  return `${webview.asWebviewUri(vscode.Uri.joinPath(appRoot, directoryName)).toString()}/`;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function mergePdfLabels() {
  return {
    title: localeMap('webview.mergePdf.title'),
    description: localeMap('webview.mergePdf.description'),
    sourceList: localeMap('webview.mergePdf.sourceList'),
    sourceListDescription: localeMap('webview.mergePdf.sourceListDescription'),
    sourceCount: localeMap('webview.mergePdf.sourceCount'),
    actions: localeMap('webview.mergePdf.actions'),
    dragHandle: localeMap('webview.mergePdf.dragHandle'),
    moveUp: localeMap('webview.mergePdf.moveUp'),
    moveDown: localeMap('webview.mergePdf.moveDown'),
    removeSource: localeMap('webview.mergePdf.removeSource'),
    preview: localeMap('webview.mergePdf.preview'),
    previewAriaLabel: localeMap('webview.mergePdf.previewAriaLabel'),
    previewLoading: localeMap('webview.mergePdf.previewLoading'),
    previewRenderError: localeMap('webview.mergePdf.previewRenderError'),
    apply: localeMap('webview.mergePdf.apply'),
    cancel: localeMap('webview.mergePdf.cancel'),
  };
}

function selectedUris(uri?: vscode.Uri, uris?: vscode.Uri[]): vscode.Uri[] {
  const candidates = uris && uris.length > 0 ? uris : uri ? [uri] : [];
  const uniqueUris = new Map(candidates.map((candidate) => [candidate.toString(), candidate]));
  const selected = [...uniqueUris.values()];

  for (const candidate of selected) {
    if (candidate.scheme !== 'file') {
      throw new Error(`Only local PDF files are supported: ${candidate.toString()}`);
    }

    if (path.extname(candidate.fsPath).toLowerCase() !== '.pdf') {
      throw new Error(`Only PDF files can be merged: ${candidate.fsPath}`);
    }
  }

  return selected;
}

async function workspaceForSources(sourceUris: vscode.Uri[]): Promise<vscode.WorkspaceFolder> {
  const firstSourceUri = sourceUris[0];

  if (!firstSourceUri) {
    throw new Error('Select at least two PDF files.');
  }

  const workspace = vscode.workspace.getWorkspaceFolder(firstSourceUri);

  if (!workspace) {
    throw new Error(`The PDF must be inside an open workspace: ${firstSourceUri.fsPath}`);
  }

  for (const sourceUri of sourceUris) {
    if (sourceUri.scheme !== 'file') {
      throw new Error(`Only local PDF files are supported: ${sourceUri.toString()}`);
    }

    const sourceWorkspace = vscode.workspace.getWorkspaceFolder(sourceUri);

    if (sourceWorkspace?.uri.toString() !== workspace.uri.toString()) {
      throw new Error('All selected PDF files must be in the same workspace.');
    }
  }

  await Promise.all(
    sourceUris.map((sourceUri) => assertExistingPathInWorkspace(sourceUri.fsPath, workspace.uri.fsPath)),
  );

  return workspace;
}
