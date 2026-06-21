import * as vscode from "vscode";

import { resolveOutputPath } from "../config/resolve_output_path.js";
import { cropPdfFiles, type CropPdfJob } from "../operations/crop_pdf_auto.js";
import { rememberLastConversion, UNDO_LAST_CONVERSION_COMMAND } from "./undo_last_conversion.js";

const DEFAULT_MARGIN_OPTIONS = [0, 5, 10, 20];
const DEFAULT_OUTPUT_PATH = "${fileDirname}/${fileBasenameNoExtension}-crop.pdf";
const UNDO_ACTION = "Undo";

export async function cropPdfAuto(uri?: vscode.Uri, uris?: vscode.Uri[]): Promise<void> {
  try {
    const sourceUris = selectedUris(uri, uris);

    if (sourceUris.length === 0) {
      throw new Error("No PDF files were selected.");
    }

    const configuration = vscode.workspace.getConfiguration("latex-graphics-helper");
    const marginOptions = readMarginOptions(configuration.get<unknown>("cropPdf.marginOptions"));
    const selectedMargin = await selectMargin(marginOptions);

    if (selectedMargin === undefined) {
      return;
    }

    const outputTemplate = configuration.get<string>("outputPath.cropPdf", DEFAULT_OUTPUT_PATH);
    const jobs = sourceUris.map((sourceUri) => createJob(sourceUri, outputTemplate));
    const ghostscriptPath =
      configuration.get<string>("execPath.ghostscript") ||
      (process.platform === "win32" ? "gswin64c.exe" : "gs");

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Cropping ${jobs.length} PDF file(s)`,
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

          progress.report({ message: "Preparing PDF conversion..." });
          await cropPdfFiles({
            jobs,
            margin: selectedMargin,
            ghostscriptPath,
            signal: abortController.signal,
          });
        } finally {
          cancellationSubscription.dispose();
        }
      },
    );

    const successMessage = `Cropped ${jobs.length} PDF file(s).`;
    let undoId: string;

    try {
      undoId = await rememberLastConversion(
        jobs.map((job) => ({
          outputPath: job.outputPath,
          workspacePath: job.workspacePath,
        })),
      );
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
      await vscode.window.showInformationMessage("PDF cropping was cancelled.");
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(`Failed to crop PDF: ${message}`);
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function selectedUris(uri?: vscode.Uri, uris?: vscode.Uri[]): vscode.Uri[] {
  const candidates = uris && uris.length > 0 ? uris : uri ? [uri] : [];
  const uniqueUris = new Map(candidates.map((candidate) => [candidate.toString(), candidate]));

  return [...uniqueUris.values()];
}

function createJob(sourceUri: vscode.Uri, outputTemplate: string): CropPdfJob {
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
    outputPath: resolveOutputPath(outputTemplate, {
      workspacePath: workspace.uri.fsPath,
      workspaceName: workspace.name,
      sourcePath,
    }),
  };
}

function readMarginOptions(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return DEFAULT_MARGIN_OPTIONS;
  }

  const options = value.filter(
    (item): item is number => typeof item === "number" && Number.isFinite(item) && item >= 0,
  );
  const uniqueOptions = [...new Set(options)];

  return uniqueOptions.length > 0 ? uniqueOptions : DEFAULT_MARGIN_OPTIONS;
}

async function selectMargin(options: number[]): Promise<number | undefined> {
  const items = options.map((margin) => ({
    label: `${margin} pt`,
    description:
      margin === 0 ? "Crop to the detected content bounds" : `Keep ${margin} pt around the content`,
    margin,
  }));
  const selected = await vscode.window.showQuickPick(items, {
    title: "Select PDF crop margin",
    placeHolder: "The selected margin is applied to all PDF files.",
  });

  return selected?.margin;
}
