import * as vscode from "vscode";

import { resolveOutputPath } from "../config/resolve_output_path.js";
import {
  convertPdfToPngFiles,
  readPdfPageCount,
  type ConvertPdfToPngPageJob,
} from "../operations/convert_pdf_to_png.js";
import { assertExistingPathInWorkspace } from "../security/workspace_path.js";
import { resolveOutputConflicts } from "./safe_mode.js";
import { rememberLastConversion, UNDO_LAST_CONVERSION_COMMAND } from "./undo_last_conversion.js";

export const CONVERT_TO_PNG_COMMAND = "latex-graphics-helper.convertToPng";

const DEFAULT_OUTPUT_PATH = "${fileDirname}/${fileBasenameNoExtension}-${page}.png";
const UNDO_ACTION = "Undo";

export async function convertToPngCommand(uri?: vscode.Uri, uris?: vscode.Uri[]): Promise<void> {
  try {
    const sourceUris = selectedUris(uri, uris);

    if (sourceUris.length === 0) {
      throw new Error("No files were selected.");
    }

    const configuration = vscode.workspace.getConfiguration("latex-graphics-helper");
    const outputTemplate = configuration.get<string>(
      "outputPath.convertPdfToPng",
      DEFAULT_OUTPUT_PATH,
    );

    if (!outputTemplate.includes("${page}")) {
      throw new Error("PDF to PNG output path must include ${page}.");
    }

    const jobs = (
      await Promise.all(sourceUris.map((sourceUri) => createJobs(sourceUri, outputTemplate)))
    ).flat();
    const pdftocairoPath = configuration.get<string>("execPath.pdftocairo", "pdftocairo");
    const outputs = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Converting ${sourceUris.length} PDF file(s) to PNG`,
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
          return await convertPdfToPngFiles({
            jobs,
            pdftocairoPath,
            signal: abortController.signal,
            resolveOutputConflicts,
          });
        } finally {
          cancellationSubscription.dispose();
        }
      },
    );

    const successMessage = `Converted ${outputs.length} page(s) to PNG.`;
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
    await vscode.window.showErrorMessage(`Failed to convert to PNG: ${message}`);
  }
}

function selectedUris(uri?: vscode.Uri, uris?: vscode.Uri[]): vscode.Uri[] {
  const candidates = uris && uris.length > 0 ? uris : uri ? [uri] : [];
  const uniqueUris = new Map(candidates.map((candidate) => [candidate.toString(), candidate]));

  return [...uniqueUris.values()];
}

async function createJobs(
  sourceUri: vscode.Uri,
  outputTemplate: string,
): Promise<ConvertPdfToPngPageJob[]> {
  if (sourceUri.scheme !== "file") {
    throw new Error(`Only local PDF files are supported: ${sourceUri.toString()}`);
  }

  if (!sourceUri.fsPath.toLowerCase().endsWith(".pdf")) {
    throw new Error(`Unsupported PNG conversion input: ${sourceUri.fsPath}`);
  }

  const workspace = vscode.workspace.getWorkspaceFolder(sourceUri);

  if (!workspace) {
    throw new Error(`The PDF file must be inside an open workspace: ${sourceUri.fsPath}`);
  }

  await assertExistingPathInWorkspace(sourceUri.fsPath, workspace.uri.fsPath);
  const pageCount = await readPdfPageCount(sourceUri.fsPath);

  return Array.from({ length: pageCount }, (_value, index) => {
    const pageNumber = index + 1;

    return {
      sourcePath: sourceUri.fsPath,
      workspacePath: workspace.uri.fsPath,
      pageNumber,
      outputPath: resolveOutputPath(outputTemplate, {
        sourcePath: sourceUri.fsPath,
        workspacePath: workspace.uri.fsPath,
        workspaceName: workspace.name,
        page: pageNumber.toString(),
      }),
    };
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
