import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument } from "pdf-lib";
import * as vscode from "vscode";

import { readOutputFormatOutputTemplate } from "../config/output_path_settings.js";
import { resolveOutputPath } from "../config/resolve_output_path.js";
import { assertExistingPathInWorkspace } from "../security/workspace_path.js";
import type { LineOutputChannel } from "../operations/external_tool_ascii_scratch.js";
import type { MermaidPuppeteerOptions } from "../operations/convert_png_to_pdf.js";
import {
  convertToWebpFiles,
  type ConvertToWebpJob,
  type DrawioToWebpOptions,
  type WebpOutputOptions,
} from "../operations/convert_to_webp.js";
import { logicalSourcePathForOutputTemplate } from "./convert_png_to_pdf.js";
import { resolveOutputConflicts } from "./safe_mode.js";
import { runConversionCommand } from "./run_conversion_command.js";
import { userMessage } from "./user_messages.js";

export const CONVERT_TO_WEBP_COMMAND = "latex-graphics-helper.convertToWebp";

const DEFAULT_OUTPUT_PATH = "${fileDirname}/${fileBasenameNoExtension}.webp";
const DEFAULT_PDF_OUTPUT_PATH = "${fileDirname}/${fileBasenameNoExtension}-${page}.webp";
const DEFAULT_DRAWIO_OUTPUT_PATH = "${fileDirname}/${fileBasenameNoExtension}/${page}.webp";
const DEFAULT_WEBP_EFFORT = 4;

export async function convertToWebpCommand(
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
  outputChannel?: LineOutputChannel,
): Promise<void> {
  try {
    const sourceUris = selectedUris(uri, uris);

    if (sourceUris.length === 0) {
      throw new Error("No files were selected.");
    }

    const configuration = vscode.workspace.getConfiguration("latex-graphics-helper");
    const outputFormatOutputTemplate = readOutputFormatOutputTemplate(
      configuration,
      "outputPath.convertToWebp",
    );
    const jobs = (
      await Promise.all(
        sourceUris.map((sourceUri) =>
          createJobs(sourceUri, configuration, outputFormatOutputTemplate),
        ),
      )
    ).flat();
    const mermaid = readMermaidPuppeteerOptions(configuration);
    const drawio = readDrawioToWebpOptions(configuration);
    const webp = readWebpOutputOptions(configuration);
    const pdftocairoPath = configuration.get<string>("execPath.pdftocairo", "pdftocairo");
    await runConversionCommand({
      operationName: "convert-to-webp",
      ...(outputChannel !== undefined && { outputChannel }),
      messages: {
        progressTitle: userMessage(
          "message.progress.convertToOutput.title",
          sourceUris.length,
          "WebP",
        ),
        prepareMessage: userMessage("message.progress.prepareConversion", "WebP"),
        successMessage: (count) => userMessage("message.convertToOutput.success", count, "WebP"),
        undoUnavailableMessage: (success, reason) =>
          userMessage("message.undoUnavailable", success, reason),
        cancelledMessage: userMessage("message.convertToOutput.cancelled", "WebP"),
        failedMessage: (reason) => userMessage("message.convertToOutput.failed", "WebP", reason),
      },
      run: (signal) =>
        convertToWebpFiles({
          jobs,
          pdftocairoPath,
          mermaid,
          drawio,
          webp,
          platform: process.platform,
          signal,
          resolveOutputConflicts,
          ...(outputChannel !== undefined && { outputChannel }),
        }),
    });
  } catch (error) {
    if (isAbortError(error)) {
      await vscode.window.showInformationMessage(
        userMessage("message.convertToOutput.cancelled", "WebP"),
      );
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(
      userMessage("message.convertToOutput.failed", "WebP", message),
    );
  }
}

async function createJobs(
  sourceUri: vscode.Uri,
  configuration: vscode.WorkspaceConfiguration,
  outputFormatOutputTemplate: string | undefined,
): Promise<ConvertToWebpJob[]> {
  if (sourceUri.scheme !== "file") {
    throw new Error(`Only local files are supported: ${sourceUri.toString()}`);
  }

  const workspace = vscode.workspace.getWorkspaceFolder(sourceUri);

  if (!workspace) {
    throw new Error(`The file must be inside an open workspace: ${sourceUri.fsPath}`);
  }

  const sourcePath = sourceUri.fsPath;
  const extension = path.extname(sourcePath).toLowerCase();

  if (extension === ".webp" && !isEditableDrawioImagePath(sourcePath)) {
    throw new Error(`Unsupported input for WebP conversion: ${sourcePath}`);
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
): Promise<ConvertToWebpJob[]> {
  const document = await PDFDocument.load(await readFile(sourcePath));
  const pageCount = document.getPageCount();

  if (pageCount === 0) {
    throw new Error(`PDF has no pages: ${sourcePath}`);
  }

  const outputTemplate =
    outputFormatOutputTemplate ??
    configuration.get<string>("outputPath.convertPdfToWebp", DEFAULT_PDF_OUTPUT_PATH);

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
    return configuration.get<string>("outputPath.convertDrawioToWebp", DEFAULT_DRAWIO_OUTPUT_PATH);
  }

  switch (extension) {
    case ".png": {
      return configuration.get<string>("outputPath.convertPngToWebp", DEFAULT_OUTPUT_PATH);
    }
    case ".jpg":
    case ".jpeg": {
      return configuration.get<string>("outputPath.convertJpegToWebp", DEFAULT_OUTPUT_PATH);
    }
    case ".avif": {
      return configuration.get<string>("outputPath.convertAvifToWebp", DEFAULT_OUTPUT_PATH);
    }
    case ".svg": {
      return configuration.get<string>("outputPath.convertSvgToWebp", DEFAULT_OUTPUT_PATH);
    }
    case ".mmd":
    case ".mermaid": {
      return configuration.get<string>("outputPath.convertMermaidToWebp", DEFAULT_OUTPUT_PATH);
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

function readDrawioToWebpOptions(
  configuration: vscode.WorkspaceConfiguration,
): DrawioToWebpOptions {
  const configuredPath = configuration.get<string>("execPath.drawio", "").trim();

  return {
    drawioPath: configuredPath || defaultDrawioPath(),
  };
}

function readWebpOutputOptions(configuration: vscode.WorkspaceConfiguration): WebpOutputOptions {
  const effort = configuration.get<number>("convertToWebp.effort", DEFAULT_WEBP_EFFORT);

  if (!Number.isInteger(effort) || effort < 0 || effort > 6) {
    throw new Error(`convertToWebp.effort must be an integer between 0 and 6: ${effort}`);
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
