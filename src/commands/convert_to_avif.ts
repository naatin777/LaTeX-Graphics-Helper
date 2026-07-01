import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument } from "pdf-lib";
import * as vscode from "vscode";

import { resolveOutputPath } from "../config/resolve_output_path.js";
import type { MermaidPuppeteerOptions } from "../operations/convert_png_to_pdf.js";
import {
  convertToAvifFiles,
  type AvifOutputOptions,
  type ConvertToAvifJob,
  type DrawioToAvifOptions,
} from "../operations/convert_to_avif.js";
import { logicalSourcePathForOutputTemplate } from "./convert_png_to_pdf.js";
import { withCancellationSignal } from "./progress_cancellation.js";
import { resolveOutputConflicts } from "./safe_mode.js";
import { rememberLastConversion, UNDO_LAST_CONVERSION_COMMAND } from "./undo_last_conversion.js";

export const CONVERT_TO_AVIF_COMMAND = "latex-graphics-helper.convertToAvif";

const DEFAULT_OUTPUT_PATH = "${fileDirname}/${fileBasenameNoExtension}.avif";
const DEFAULT_PDF_OUTPUT_PATH = "${fileDirname}/${fileBasenameNoExtension}-${page}.avif";
const DEFAULT_DRAWIO_OUTPUT_PATH = "${fileDirname}/${fileBasenameNoExtension}/${page}.avif";
const DEFAULT_AVIF_EFFORT = 4;
const UNDO_ACTION = "Undo";

export async function convertToAvifCommand(uri?: vscode.Uri, uris?: vscode.Uri[]): Promise<void> {
  try {
    const sourceUris = selectedUris(uri, uris);

    if (sourceUris.length === 0) {
      throw new Error("No files were selected.");
    }

    const configuration = vscode.workspace.getConfiguration("latex-graphics-helper");
    const jobs = (
      await Promise.all(sourceUris.map((sourceUri) => createJobs(sourceUri, configuration)))
    ).flat();
    const mermaid = readMermaidPuppeteerOptions(configuration);
    const drawio = readDrawioToAvifOptions(configuration);
    const avif = readAvifOutputOptions(configuration);
    const pdftocairoPath = configuration.get<string>("execPath.pdftocairo", "pdftocairo");
    const outputs = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Converting ${sourceUris.length} file(s) to AVIF`,
        cancellable: true,
      },
      async (progress, token) => {
        return withCancellationSignal(token, async (signal) => {
          progress.report({ message: "Preparing AVIF conversion..." });
          return convertToAvifFiles({
            jobs,
            pdftocairoPath,
            mermaid,
            drawio,
            avif,
            signal,
            resolveOutputConflicts,
          });
        });
      },
    );

    const successMessage = `Converted ${outputs.length} file(s) to AVIF.`;
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
      await vscode.window.showInformationMessage("AVIF conversion was cancelled.");
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(`Failed to convert to AVIF: ${message}`);
  }
}

async function createJobs(
  sourceUri: vscode.Uri,
  configuration: vscode.WorkspaceConfiguration,
): Promise<ConvertToAvifJob[]> {
  if (sourceUri.scheme !== "file") {
    throw new Error(`Only local files are supported: ${sourceUri.toString()}`);
  }

  const workspace = vscode.workspace.getWorkspaceFolder(sourceUri);

  if (!workspace) {
    throw new Error(`The file must be inside an open workspace: ${sourceUri.fsPath}`);
  }

  const sourcePath = sourceUri.fsPath;
  const extension = path.extname(sourcePath).toLowerCase();

  if (extension === ".avif" && !isEditableDrawioImagePath(sourcePath)) {
    throw new Error(`Unsupported input for AVIF conversion: ${sourcePath}`);
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
): Promise<ConvertToAvifJob[]> {
  const document = await PDFDocument.load(await readFile(sourcePath));
  const pageCount = document.getPageCount();

  if (pageCount === 0) {
    throw new Error(`PDF has no pages: ${sourcePath}`);
  }

  const outputTemplate = configuration.get<string>(
    "outputPath.convertPdfToAvif",
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
    return configuration.get<string>("outputPath.convertDrawioToAvif", DEFAULT_DRAWIO_OUTPUT_PATH);
  }

  switch (extension) {
    case ".png": {
      return configuration.get<string>("outputPath.convertPngToAvif", DEFAULT_OUTPUT_PATH);
    }
    case ".jpg":
    case ".jpeg": {
      return configuration.get<string>("outputPath.convertJpegToAvif", DEFAULT_OUTPUT_PATH);
    }
    case ".webp": {
      return configuration.get<string>("outputPath.convertWebpToAvif", DEFAULT_OUTPUT_PATH);
    }
    case ".svg": {
      return configuration.get<string>("outputPath.convertSvgToAvif", DEFAULT_OUTPUT_PATH);
    }
    case ".mmd":
    case ".mermaid": {
      return configuration.get<string>("outputPath.convertMermaidToAvif", DEFAULT_OUTPUT_PATH);
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
    .get<string>("convertToPdf.mermaid.puppeteer.executablePath", "")
    .trim();

  return {
    browserChannel: configuration.get<string>(
      "convertToPdf.mermaid.puppeteer.browserChannel",
      "chrome",
    ),
    ...(executablePath ? { executablePath } : {}),
  };
}

function readDrawioToAvifOptions(
  configuration: vscode.WorkspaceConfiguration,
): DrawioToAvifOptions {
  const configuredPath = configuration.get<string>("execPath.drawio", "").trim();

  return {
    drawioPath: configuredPath || defaultDrawioPath(),
  };
}

function readAvifOutputOptions(configuration: vscode.WorkspaceConfiguration): AvifOutputOptions {
  const effort = configuration.get<number>("convertToAvif.effort", DEFAULT_AVIF_EFFORT);

  if (!Number.isInteger(effort) || effort < 0 || effort > 9) {
    throw new Error(`convertToAvif.effort must be an integer between 0 and 9: ${effort}`);
  }

  return { effort };
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
