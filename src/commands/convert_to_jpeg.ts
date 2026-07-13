import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument } from "pdf-lib";
import * as vscode from "vscode";

import { readOutputFormatOutputTemplate } from "../config/output_path_settings.js";
import { resolveOutputPath } from "../config/resolve_output_path.js";
import type { MermaidPuppeteerOptions } from "../operations/convert_png_to_pdf.js";
import {
  convertToJpegFiles,
  type ConvertToJpegJob,
  type DrawioToJpegOptions,
} from "../operations/convert_to_jpeg.js";
import { logicalSourcePathForOutputTemplate } from "./convert_png_to_pdf.js";
import { withCancellationSignal } from "./progress_cancellation.js";
import { resolveOutputConflicts } from "./safe_mode.js";
import { rememberLastConversion, UNDO_LAST_CONVERSION_COMMAND } from "./undo_last_conversion.js";
import { userMessage } from "./user_messages.js";

export const CONVERT_TO_JPEG_COMMAND = "latex-graphics-helper.convertToJpeg";

const DEFAULT_OUTPUT_PATH = "${fileDirname}/${fileBasenameNoExtension}.jpeg";
const DEFAULT_PDF_OUTPUT_PATH = "${fileDirname}/${fileBasenameNoExtension}-${page}.jpeg";
const DEFAULT_DRAWIO_OUTPUT_PATH = "${fileDirname}/${fileBasenameNoExtension}/${page}.jpeg";

export async function convertToJpegCommand(uri?: vscode.Uri, uris?: vscode.Uri[]): Promise<void> {
  try {
    const sourceUris = selectedUris(uri, uris);

    if (sourceUris.length === 0) {
      throw new Error("No files were selected.");
    }

    const configuration = vscode.workspace.getConfiguration("latex-graphics-helper");
    const outputFormatOutputTemplate = readOutputFormatOutputTemplate(
      configuration,
      "outputPath.convertToJpeg",
    );
    const jobs = (
      await Promise.all(
        sourceUris.map((sourceUri) =>
          createJobs(sourceUri, configuration, outputFormatOutputTemplate),
        ),
      )
    ).flat();
    const mermaid = readMermaidPuppeteerOptions(configuration);
    const drawio = readDrawioToJpegOptions(configuration);
    const pdftocairoPath = configuration.get<string>("execPath.pdftocairo", "pdftocairo");
    const outputs = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: userMessage("message.progress.convertToOutput.title", sourceUris.length, "JPEG"),
        cancellable: true,
      },
      async (progress, token) => {
        return withCancellationSignal(token, async (signal) => {
          progress.report({ message: userMessage("message.progress.prepareConversion", "JPEG") });
          return convertToJpegFiles({
            jobs,
            pdftocairoPath,
            mermaid,
            drawio,
            platform: process.platform,
            signal,
            resolveOutputConflicts,
          });
        });
      },
    );

    const successMessage = userMessage("message.convertToOutput.success", outputs.length, "JPEG");
    let undoId: string;

    try {
      undoId = await rememberLastConversion(outputs);
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
      await vscode.window.showInformationMessage(
        userMessage("message.convertToOutput.cancelled", "JPEG"),
      );
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(
      userMessage("message.convertToOutput.failed", "JPEG", message),
    );
  }
}

async function createJobs(
  sourceUri: vscode.Uri,
  configuration: vscode.WorkspaceConfiguration,
  outputFormatOutputTemplate: string | undefined,
): Promise<ConvertToJpegJob[]> {
  if (sourceUri.scheme !== "file") {
    throw new Error(`Only local files are supported: ${sourceUri.toString()}`);
  }

  const workspace = vscode.workspace.getWorkspaceFolder(sourceUri);

  if (!workspace) {
    throw new Error(`The file must be inside an open workspace: ${sourceUri.fsPath}`);
  }

  const sourcePath = sourceUri.fsPath;
  const extension = path.extname(sourcePath).toLowerCase();

  if ((extension === ".jpg" || extension === ".jpeg") && !isEditableDrawioImagePath(sourcePath)) {
    throw new Error(`Unsupported input for JPEG conversion: ${sourcePath}`);
  }

  if (extension === ".pdf") {
    return createPdfJobs(sourcePath, workspace, configuration, outputFormatOutputTemplate);
  }

  const page = isEditableDrawioImagePath(sourcePath) ? "1" : undefined;
  const outputTemplate = outputTemplateForSource(
    sourcePath,
    configuration,
    outputFormatOutputTemplate,
  );
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
  outputFormatOutputTemplate: string | undefined,
): Promise<ConvertToJpegJob[]> {
  const document = await PDFDocument.load(await readFile(sourcePath));
  const pageCount = document.getPageCount();

  if (pageCount === 0) {
    throw new Error(`PDF has no pages: ${sourcePath}`);
  }

  const outputTemplate =
    outputFormatOutputTemplate ??
    configuration.get<string>("outputPath.convertPdfToJpeg", DEFAULT_PDF_OUTPUT_PATH);

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
  outputFormatOutputTemplate: string | undefined,
): string {
  if (outputFormatOutputTemplate !== undefined) {
    return outputFormatOutputTemplate;
  }

  const extension = path.extname(sourcePath).toLowerCase();

  if (isEditableDrawioImagePath(sourcePath)) {
    return configuration.get<string>("outputPath.convertDrawioToJpeg", DEFAULT_DRAWIO_OUTPUT_PATH);
  }

  switch (extension) {
    case ".png": {
      return configuration.get<string>("outputPath.convertPngToJpeg", DEFAULT_OUTPUT_PATH);
    }
    case ".webp": {
      return configuration.get<string>("outputPath.convertWebpToJpeg", DEFAULT_OUTPUT_PATH);
    }
    case ".avif": {
      return configuration.get<string>("outputPath.convertAvifToJpeg", DEFAULT_OUTPUT_PATH);
    }
    case ".svg": {
      return configuration.get<string>("outputPath.convertSvgToJpeg", DEFAULT_OUTPUT_PATH);
    }
    case ".mmd":
    case ".mermaid": {
      return configuration.get<string>("outputPath.convertMermaidToJpeg", DEFAULT_OUTPUT_PATH);
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

function readDrawioToJpegOptions(
  configuration: vscode.WorkspaceConfiguration,
): DrawioToJpegOptions {
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
