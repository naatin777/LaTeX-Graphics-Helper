import path from "node:path";

import * as vscode from "vscode";

import { mergePdf } from "../operations/merge_pdf.js";
import { userMessage } from "./user_messages.js";

export const MERGE_PDF_SELECTED_PAGES_COMMAND = "latex-graphics-helper.mergePdf.selectedPages";

export async function mergePdfSelectedPagesCommand(
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
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

    await mergePdf({
      sourcePaths: sourceUris.map((sourceUri) => sourceUri.fsPath),
      outputPath: outputUri.fsPath,
      workspacePath: workspace.uri.fsPath,
    });

    await vscode.window.showInformationMessage(
      userMessage("message.mergePdf.success", sourceUris.length),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(userMessage("message.mergePdf.failed", message));
  }
}

function selectedUris(uri?: vscode.Uri, uris?: vscode.Uri[]): vscode.Uri[] {
  const candidates = uris && uris.length > 0 ? uris : uri ? [uri] : [];
  const uniqueUris = new Map(candidates.map((candidate) => [candidate.toString(), candidate]));

  return [...uniqueUris.values()].filter((candidate) =>
    candidate.fsPath.toLowerCase().endsWith(".pdf"),
  );
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
