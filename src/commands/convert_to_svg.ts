import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument } from "pdf-lib";
import * as vscode from "vscode";
import { resolveOutputPath } from "../config/resolve_output_path.js";
import {
  convertToSvgFiles,
  type ConvertToSvgJob,
  type DrawioToSvgOptions,
  type MermaidPuppeteerOptions,
} from "../operations/convert_to_svg.js";
import { logicalSourcePathForOutputTemplate } from "./convert_png_to_pdf.js";
import { resolveOutputConflicts } from "./safe_mode.js";
import { rememberLastConversion, UNDO_LAST_CONVERSION_COMMAND } from "./undo_last_conversion.js";

export const CONVERT_TO_SVG_COMMAND = "latex-graphics-helper.convertToSvg";

const DEFAULT_OUTPUT_PATH = "${fileDirname}/${fileBasenameNoExtension}.svg";
const DEFAULT_PDF_OUTPUT_PATH = "${fileDirname}/${fileBasenameNoExtension}-${page}.svg";
const DEFAULT_DRAWIO_OUTPUT_PATH = "${fileDirname}/${fileBasenameNoExtension}/${page}.svg";
const UNDO_ACTION = "Undo";

export async function convertToSvgCommand(uri?: vscode.Uri, uris?: vscode.Uri[]): Promise<void> {
  try {
    const sourceUris = selectedUris(uri, uris);

    if (sourceUris.length === 0) {
      throw new Error("No files were selected.");
    }

    const configuration = vscode.workspace.getConfiguration("latex-graphics-helper");
    const jobs = (
      await Promise.all(sourceUris.map((sourceUri) => createJobs(sourceUri, configuration)))
    ).flat();
    const puppeteer = readMermaidPuppeteerOptions(configuration);
    const drawio = readDrawioToSvgOptions(configuration);
    const pdftocairoPath = configuration.get<string>("execPath.pdftocairo", "pdftocairo");
    const outputs = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Converting ${sourceUris.length} file(s) to SVG`,
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
          return await convertToSvgFiles({
            jobs,
            pdftocairoPath,
            mermaid: puppeteer,
            drawio,
            signal: abortController.signal,
            resolveOutputConflicts,
          });
        } finally {
          cancellationSubscription.dispose();
        }
      },
    );

    const successMessage = `Converted ${outputs.length} file(s) to SVG.`;
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

async function createJobs(
  sourceUri: vscode.Uri,
  configuration: vscode.WorkspaceConfiguration,
): Promise<ConvertToSvgJob[]> {
  if (sourceUri.scheme !== "file") {
    throw new Error(`Only local files are supported: ${sourceUri.toString()}`);
  }

  const workspace = vscode.workspace.getWorkspaceFolder(sourceUri);

  if (!workspace) {
    throw new Error(`The file must be inside an open workspace: ${sourceUri.fsPath}`);
  }

  const sourcePath = sourceUri.fsPath;
  const extension = path.extname(sourcePath).toLowerCase();

  if (extension === ".svg" && !isEditableDrawioImagePath(sourcePath)) {
    throw new Error(`Unsupported input for SVG conversion: ${sourcePath}`);
  }

  if (extension === ".pdf") {
    return createPdfJobs(sourcePath, workspace, configuration);
  }

  const page = isEditableDrawioImagePath(sourcePath) ? "1" : undefined;
  const outputTemplate = outputTemplateForSource(sourcePath, configuration);
  const outputPath = resolveOutputPath(outputTemplate, {
    sourcePath: logicalSourcePathForOutputTemplate(sourcePath),
    workspacePath: workspace.uri.fsPath,
    workspaceName: workspace.name,
    ...(page !== undefined && { page }),
  });

  return [
    {
      sourcePath,
      workspacePath: workspace.uri.fsPath,
      outputPath,
      ...(page !== undefined && { page: Number(page) }),
    },
  ];
}

async function createPdfJobs(
  sourcePath: string,
  workspace: vscode.WorkspaceFolder,
  configuration: vscode.WorkspaceConfiguration,
): Promise<ConvertToSvgJob[]> {
  const document = await PDFDocument.load(await readFile(sourcePath));
  const pageCount = document.getPageCount();

  if (pageCount === 0) {
    throw new Error(`PDF has no pages: ${sourcePath}`);
  }

  const outputTemplate = configuration.get<string>(
    "outputPath.convertPdfToSvg",
    DEFAULT_PDF_OUTPUT_PATH,
  );

  return Array.from({ length: pageCount }, (_value, index) => {
    const page = index + 1;
    return {
      sourcePath,
      workspacePath: workspace.uri.fsPath,
      outputPath: resolveOutputPath(outputTemplate, {
        sourcePath,
        workspacePath: workspace.uri.fsPath,
        workspaceName: workspace.name,
        page: String(page),
      }),
      page,
    };
  });
}

function outputTemplateForSource(
  sourcePath: string,
  configuration: vscode.WorkspaceConfiguration,
): string {
  const extension = path.extname(sourcePath).toLowerCase();

  if (isEditableDrawioImagePath(sourcePath)) {
    return configuration.get<string>("outputPath.convertDrawioToSvg", DEFAULT_DRAWIO_OUTPUT_PATH);
  }

  switch (extension) {
    case ".mmd":
    case ".mermaid": {
      return configuration.get<string>("outputPath.convertMermaidToSvg", DEFAULT_OUTPUT_PATH);
    }
    default: {
      return DEFAULT_OUTPUT_PATH;
    }
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

function readDrawioToSvgOptions(configuration: vscode.WorkspaceConfiguration): DrawioToSvgOptions {
  const configuredPath = configuration.get<string>("execPath.drawio", "").trim();

  return {
    drawioPath: configuredPath || defaultDrawioPath(),
  };
}

function defaultDrawioPath(): string {
  return process.platform === "win32" ? "drawio.exe" : "drawio";
}

function selectedUris(uri?: vscode.Uri, uris?: vscode.Uri[]): vscode.Uri[] {
  const candidates = uris && uris.length > 0 ? uris : uri ? [uri] : [];
  const uniqueUris = new Map(candidates.map((candidate) => [candidate.toString(), candidate]));

  return [...uniqueUris.values()];
}

function isEditableDrawioImagePath(sourcePath: string): boolean {
  return /\.(drawio|dio)\.(png|svg)$/i.test(sourcePath);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
