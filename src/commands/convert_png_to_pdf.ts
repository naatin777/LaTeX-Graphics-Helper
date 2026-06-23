import path from "node:path";

import * as vscode from "vscode";

import { resolveOutputPath } from "../config/resolve_output_path.js";
import { convertPngToPdfFiles, type ConvertPngToPdfJob } from "../operations/convert_png_to_pdf.js";
import { resolveOutputConflicts } from "./safe_mode.js";
import { rememberLastConversion, UNDO_LAST_CONVERSION_COMMAND } from "./undo_last_conversion.js";

export const CONVERT_PNG_TO_PDF_COMMAND = "latex-graphics-helper.convertPngToPdf";

const DEFAULT_OUTPUT_PATH = "${fileDirname}/${fileBasenameNoExtension}.pdf";
const UNDO_ACTION = "Undo";

export async function convertPngToPdfCommand(uri?: vscode.Uri, uris?: vscode.Uri[]): Promise<void> {
  try {
    const sourceUris = selectedUris(uri, uris);

    if (sourceUris.length === 0) {
      throw new Error("No PNG files were selected.");
    }

    const configuration = vscode.workspace.getConfiguration("latex-graphics-helper");
    const outputTemplate = configuration.get<string>(
      "outputPath.convertPngToPdf",
      DEFAULT_OUTPUT_PATH,
    );
    const jobs = sourceUris.map((sourceUri) => createJob(sourceUri, outputTemplate));
    const outputs = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Converting ${jobs.length} PNG file(s) to PDF`,
        cancellable: true,
      },
      async (progress, token) => {
        const abortController = new AbortController();
        const cancellationSubscription = token.onCancellationRequested(() => {
          abortController.abort();
        });

        try {
          if (token.isCancellationRequested) {
            abortController.abort();
          }

          progress.report({ message: "Preparing PNG conversion..." });
          return await convertPngToPdfFiles({
            jobs,
            signal: abortController.signal,
            resolveOutputConflicts,
          });
        } finally {
          cancellationSubscription.dispose();
        }
      },
    );

    const successMessage = `Converted ${outputs.length} PNG file(s) to PDF.`;
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
      await vscode.window.showInformationMessage("PNG conversion was cancelled.");
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(`Failed to convert PNG to PDF: ${message}`);
  }
}

function selectedUris(uri?: vscode.Uri, uris?: vscode.Uri[]): vscode.Uri[] {
  const candidates = uris && uris.length > 0 ? uris : uri ? [uri] : [];
  const uniqueUris = new Map(candidates.map((candidate) => [candidate.toString(), candidate]));

  return [...uniqueUris.values()];
}

function createJob(sourceUri: vscode.Uri, outputTemplate: string): ConvertPngToPdfJob {
  if (sourceUri.scheme !== "file") {
    throw new Error(`Only local PNG files are supported: ${sourceUri.toString()}`);
  }

  if (path.extname(sourceUri.fsPath).toLowerCase() !== ".png") {
    throw new Error(`Only PNG files can be converted: ${sourceUri.fsPath}`);
  }

  const workspace = vscode.workspace.getWorkspaceFolder(sourceUri);

  if (!workspace) {
    throw new Error(`The PNG must be inside an open workspace: ${sourceUri.fsPath}`);
  }

  return {
    sourcePath: sourceUri.fsPath,
    workspacePath: workspace.uri.fsPath,
    outputPath: resolveOutputPath(outputTemplate, {
      sourcePath: sourceUri.fsPath,
      workspacePath: workspace.uri.fsPath,
      workspaceName: workspace.name,
    }),
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
