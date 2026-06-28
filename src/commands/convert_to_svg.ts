import path from "node:path";

import * as vscode from "vscode";

import { resolveOutputPath } from "../config/resolve_output_path.js";
import {
  convertMermaidToSvgFiles,
  type ConvertMermaidToSvgJob,
  type MermaidPuppeteerOptions,
} from "../operations/convert_mermaid_to_svg.js";
import { resolveOutputConflicts } from "./safe_mode.js";
import { rememberLastConversion, UNDO_LAST_CONVERSION_COMMAND } from "./undo_last_conversion.js";

export const CONVERT_TO_SVG_COMMAND = "latex-graphics-helper.convertToSvg";

const DEFAULT_OUTPUT_PATH = "${fileDirname}/${fileBasenameNoExtension}.svg";
const UNDO_ACTION = "Undo";

export async function convertToSvgCommand(
  extensionPath: string,
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
): Promise<void> {
  try {
    const sourceUris = selectedUris(uri, uris);

    if (sourceUris.length === 0) {
      throw new Error("No files were selected.");
    }

    const configuration = vscode.workspace.getConfiguration("latex-graphics-helper");
    const outputTemplate = configuration.get<string>(
      "outputPath.convertMermaidToSvg",
      DEFAULT_OUTPUT_PATH,
    );
    const jobs = sourceUris.map((sourceUri) => createJob(sourceUri, outputTemplate));
    const mermaidCliPath = resolveMermaidCliPath(extensionPath);
    const puppeteer = readMermaidPuppeteerOptions(configuration);
    const outputs = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Converting ${jobs.length} Mermaid file(s) to SVG`,
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

          progress.report({ message: "Preparing SVG conversion..." });
          return await convertMermaidToSvgFiles({
            jobs,
            mermaidCliPath,
            puppeteer,
            signal: abortController.signal,
            resolveOutputConflicts,
          });
        } finally {
          cancellationSubscription.dispose();
        }
      },
    );

    const successMessage = `Converted ${outputs.length} Mermaid file(s) to SVG.`;
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
      await vscode.window.showInformationMessage("SVG conversion was cancelled.");
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(`Failed to convert to SVG: ${message}`);
  }
}

function readMermaidPuppeteerOptions(
  configuration: vscode.WorkspaceConfiguration,
): MermaidPuppeteerOptions {
  const executablePath = configuration
    .get<string>("convertToSvg.mermaid.puppeteer.executablePath", "")
    .trim();

  return {
    browserChannel: configuration.get<string>(
      "convertToSvg.mermaid.puppeteer.browserChannel",
      "chrome",
    ),
    ...(executablePath ? { executablePath } : {}),
  };
}

function selectedUris(uri?: vscode.Uri, uris?: vscode.Uri[]): vscode.Uri[] {
  const candidates = uris && uris.length > 0 ? uris : uri ? [uri] : [];
  const uniqueUris = new Map(candidates.map((candidate) => [candidate.toString(), candidate]));

  return [...uniqueUris.values()];
}

function createJob(sourceUri: vscode.Uri, outputTemplate: string): ConvertMermaidToSvgJob {
  if (sourceUri.scheme !== "file") {
    throw new Error(`Only local Mermaid files are supported: ${sourceUri.toString()}`);
  }

  const workspace = vscode.workspace.getWorkspaceFolder(sourceUri);

  if (!workspace) {
    throw new Error(`The Mermaid file must be inside an open workspace: ${sourceUri.fsPath}`);
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

function resolveMermaidCliPath(extensionPath: string): string {
  return path.join(
    extensionPath,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "mmdc.cmd" : "mmdc",
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
