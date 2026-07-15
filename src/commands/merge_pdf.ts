import path from "node:path";

import * as vscode from "vscode";

import type { LineOutputChannel } from "../operations/external_tool_ascii_scratch.js";
import { mergePdf } from "../operations/merge_pdf.js";
import { withCancellationSignal } from "./progress_cancellation.js";
import { resolveOutputConflicts } from "./safe_mode.js";
import { rememberLastConversion, UNDO_LAST_CONVERSION_COMMAND } from "./undo_last_conversion.js";
import { userMessage } from "./user_messages.js";

export const MERGE_PDF_SELECTED_FILES_COMMAND = "latex-graphics-helper.mergePdf.selectedFiles";

export async function mergePdfSelectedFilesCommand(
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
  outputChannel?: LineOutputChannel,
): Promise<void> {
  try {
    const sourceUris = selectedUris(uri, uris);

    if (sourceUris.length < 2) {
      throw new Error("Select at least two PDF files.");
    }

    const workspace = workspaceForSources(sourceUris);
    const outputUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(path.join(workspace.uri.fsPath, "merged.pdf")),
      filters: { PDF: ["pdf"] },
      saveLabel: "Merge",
    });

    if (!outputUri) {
      return;
    }

    const outputs = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: userMessage("message.progress.mergePdf.title", sourceUris.length),
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

    const successMessage = userMessage("message.mergePdf.success", sourceUris.length);
    let undoId: string;

    try {
      undoId = await rememberLastConversion(outputs, outputChannel);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await vscode.window.showWarningMessage(
        userMessage("message.undoUnavailable", successMessage, message),
      );
      return;
    }

    const undoAction = userMessage("message.action.undo");
    const selectedAction = await vscode.window.showInformationMessage(successMessage, undoAction);

    if (selectedAction === undoAction) {
      await vscode.commands.executeCommand(UNDO_LAST_CONVERSION_COMMAND, undoId);
    }
  } catch (error) {
    if (isAbortError(error)) {
      await vscode.window.showInformationMessage(userMessage("message.mergePdf.cancelled"));
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(userMessage("message.mergePdf.failed", message));
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function selectedUris(uri?: vscode.Uri, uris?: vscode.Uri[]): vscode.Uri[] {
  const candidates = uris && uris.length > 0 ? uris : uri ? [uri] : [];
  const uniqueUris = new Map(candidates.map((candidate) => [candidate.toString(), candidate]));
  const selected = [...uniqueUris.values()];

  for (const candidate of selected) {
    if (candidate.scheme !== "file") {
      throw new Error(`Only local PDF files are supported: ${candidate.toString()}`);
    }

    if (path.extname(candidate.fsPath).toLowerCase() !== ".pdf") {
      throw new Error(`Only PDF files can be merged: ${candidate.fsPath}`);
    }
  }

  return selected;
}

function workspaceForSources(sourceUris: vscode.Uri[]): vscode.WorkspaceFolder {
  const firstSourceUri = sourceUris[0];

  if (!firstSourceUri) {
    throw new Error("Select at least two PDF files.");
  }

  const workspace = vscode.workspace.getWorkspaceFolder(firstSourceUri);

  if (!workspace) {
    throw new Error(`The PDF must be inside an open workspace: ${firstSourceUri.fsPath}`);
  }

  for (const sourceUri of sourceUris) {
    if (sourceUri.scheme !== "file") {
      throw new Error(`Only local PDF files are supported: ${sourceUri.toString()}`);
    }

    const sourceWorkspace = vscode.workspace.getWorkspaceFolder(sourceUri);

    if (sourceWorkspace?.uri.toString() !== workspace.uri.toString()) {
      throw new Error("All selected PDF files must be in the same workspace.");
    }
  }

  return workspace;
}
