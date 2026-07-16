import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument } from "pdf-lib";
import * as vscode from "vscode";

import { readOutputFormatOutputTemplate } from "../config/output_path_settings.js";
import { resolveOutputPath } from "../config/resolve_output_path.js";
import {
  isEditableDrawioImagePath,
  logicalSourcePathForOutputTemplate,
} from "../application/source_format.js";
import { assertExistingPathInWorkspace } from "../security/workspace_path.js";
import type { CommandDependencies } from "./command_dependencies.js";
import type { MermaidPuppeteerOptions } from "../operations/convert_png_to_pdf.js";
import {
  convertToJpegFiles,
  type ConvertToJpegJob,
  type DrawioToJpegOptions,
} from "../operations/convert_to_jpeg.js";
import { resolveOutputConflicts } from "./safe_mode.js";
import { createOutputConversionMessages, runOutputConversion } from "./run_output_conversion.js";
import { userMessage } from "./user_messages.js";

export const CONVERT_TO_JPEG_COMMAND = "latex-graphics-helper.convertToJpeg";

const DEFAULT_OUTPUT_PATH = "${fileDirname}/${fileBasenameNoExtension}.jpeg";
const DEFAULT_PDF_OUTPUT_PATH = "${fileDirname}/${fileBasenameNoExtension}-${page}.jpeg";
const DEFAULT_DRAWIO_OUTPUT_PATH = "${fileDirname}/${fileBasenameNoExtension}/${page}.jpeg";

export async function convertToJpegCommand(
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
  dependencies?: CommandDependencies,
): Promise<void> {
  const outputChannel = dependencies?.outputChannel;
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
    await runOutputConversion({
      operationName: "convert-to-jpeg",
      ...(outputChannel !== undefined && { outputChannel }),
      resolveConflicts: resolveOutputConflicts,
      messages: createOutputConversionMessages("JPEG", sourceUris.length),
      run: (runtime) =>
        convertToJpegFiles({
          jobs,
          pdftocairoPath,
          mermaid,
          drawio,
          platform: process.platform,
          ...(runtime.signal !== undefined && { signal: runtime.signal }),
          ...(runtime.resolveConflicts !== undefined && {
            resolveOutputConflicts: runtime.resolveConflicts,
          }),
          ...(runtime.outputChannel !== undefined && { outputChannel: runtime.outputChannel }),
        }),
    });
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
    await assertExistingPathInWorkspace(sourcePath, workspace.uri.fsPath);
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

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
