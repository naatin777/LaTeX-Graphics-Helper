import * as vscode from "vscode";

import { resolveOutputPath } from "../config/resolve_output_path.js";
import { splitPdfAllPages, type SplitPdfJob } from "../operations/split_pdf_all_pages.js";
import { withCancellationSignal } from "./progress_cancellation.js";
import { resolveOutputConflicts } from "./safe_mode.js";
import { rememberLastConversion, UNDO_LAST_CONVERSION_COMMAND } from "./undo_last_conversion.js";

const DEFAULT_OUTPUT_PATH = "${fileDirname}/${fileBasenameNoExtension}/${page}.pdf";
const UNDO_ACTION = "Undo";

export async function splitPdfAllPagesCommand(
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
): Promise<void> {
  try {
    const sourceUris = selectedUris(uri, uris);

    if (sourceUris.length === 0) {
      throw new Error("No PDF files were selected.");
    }

    const configuration = vscode.workspace.getConfiguration("latex-graphics-helper");
    const outputTemplate = configuration.get<string>("outputPath.splitPdf", DEFAULT_OUTPUT_PATH);
    const jobs = sourceUris.map((sourceUri) => createJob(sourceUri, outputTemplate));
    const outputs = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Splitting ${jobs.length} PDF file(s)`,
        cancellable: true,
      },
      async (progress, token) => {
        return withCancellationSignal(token, async (signal) => {
          progress.report({ message: "Preparing PDF split..." });
          return splitPdfAllPages({
            jobs,
            signal,
            resolveOutputConflicts,
          });
        });
      },
    );

    const successMessage = `Created ${outputs.length} split PDF file(s).`;
    let undoId: string;

    try {
      undoId = await rememberLastConversion(outputs);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await vscode.window.showWarningMessage(`${successMessage} Undo is unavailable: ${message}`);
      return;
    }

    const selectedAction = await vscode.window.showInformationMessage(successMessage, UNDO_ACTION);

    if (selectedAction === UNDO_ACTION) {
      await vscode.commands.executeCommand(UNDO_LAST_CONVERSION_COMMAND, undoId);
    }
  } catch (error) {
    if (isAbortError(error)) {
      await vscode.window.showInformationMessage("PDF splitting was cancelled.");
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(`Failed to split PDF: ${message}`);
  }
}

function selectedUris(uri?: vscode.Uri, uris?: vscode.Uri[]): vscode.Uri[] {
  const candidates = uris && uris.length > 0 ? uris : uri ? [uri] : [];
  const uniqueUris = new Map(candidates.map((candidate) => [candidate.toString(), candidate]));

  return [...uniqueUris.values()];
}

function createJob(sourceUri: vscode.Uri, outputTemplate: string): SplitPdfJob {
  if (sourceUri.scheme !== "file") {
    throw new Error(`Only local PDF files are supported: ${sourceUri.toString()}`);
  }

  const workspace = vscode.workspace.getWorkspaceFolder(sourceUri);

  if (!workspace) {
    throw new Error(`The PDF must be inside an open workspace: ${sourceUri.fsPath}`);
  }

  const sourcePath = sourceUri.fsPath;

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
  return error instanceof Error && error.name === "AbortError";
}
