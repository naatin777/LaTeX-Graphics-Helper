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
  convertToAvifFiles,
  type AvifOutputOptions,
  type ConvertToAvifJob,
  type DrawioToAvifOptions,
} from "../operations/convert_to_avif.js";
import { logicalSourcePathForOutputTemplate } from "./convert_png_to_pdf.js";
import { resolveOutputConflicts } from "./safe_mode.js";
import { runConversionCommand } from "./run_conversion_command.js";
import { userMessage } from "./user_messages.js";

export const CONVERT_TO_AVIF_COMMAND = "latex-graphics-helper.convertToAvif";

const DEFAULT_OUTPUT_PATH = "${fileDirname}/${fileBasenameNoExtension}.avif";
const DEFAULT_PDF_OUTPUT_PATH = "${fileDirname}/${fileBasenameNoExtension}-${page}.avif";
const DEFAULT_DRAWIO_OUTPUT_PATH = "${fileDirname}/${fileBasenameNoExtension}/${page}.avif";
const DEFAULT_AVIF_EFFORT = 4;

export async function convertToAvifCommand(
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
      "outputPath.convertToAvif",
    );
    const jobs = (
      await Promise.all(
        sourceUris.map((sourceUri) =>
          createJobs(sourceUri, configuration, outputFormatOutputTemplate),
        ),
      )
    ).flat();
    const mermaid = readMermaidPuppeteerOptions(configuration);
    const drawio = readDrawioToAvifOptions(configuration);
    const avif = readAvifOutputOptions(configuration);
    const pdftocairoPath = configuration.get<string>("execPath.pdftocairo", "pdftocairo");
    await runConversionCommand({
      operationName: "convert-to-avif",
      ...(outputChannel !== undefined && { outputChannel }),
      messages: {
        progressTitle: userMessage(
          "message.progress.convertToOutput.title",
          sourceUris.length,
          "AVIF",
        ),
        prepareMessage: userMessage("message.progress.prepareConversion", "AVIF"),
        successMessage: (count) => userMessage("message.convertToOutput.success", count, "AVIF"),
        undoUnavailableMessage: (success, reason) =>
          userMessage("message.undoUnavailable", success, reason),
        cancelledMessage: userMessage("message.convertToOutput.cancelled", "AVIF"),
        failedMessage: (reason) => userMessage("message.convertToOutput.failed", "AVIF", reason),
      },
      run: (signal) =>
        convertToAvifFiles({
          jobs,
          pdftocairoPath,
          mermaid,
          drawio,
          avif,
          platform: process.platform,
          signal,
          resolveOutputConflicts,
          ...(outputChannel !== undefined && { outputChannel }),
        }),
    });
  } catch (error) {
    if (isAbortError(error)) {
      await vscode.window.showInformationMessage(
        userMessage("message.convertToOutput.cancelled", "AVIF"),
      );
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(
      userMessage("message.convertToOutput.failed", "AVIF", message),
    );
  }
}

async function createJobs(
  sourceUri: vscode.Uri,
  configuration: vscode.WorkspaceConfiguration,
  outputFormatOutputTemplate: string | undefined,
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
): Promise<ConvertToAvifJob[]> {
  const document = await PDFDocument.load(await readFile(sourcePath));
  const pageCount = document.getPageCount();

  if (pageCount === 0) {
    throw new Error(`PDF has no pages: ${sourcePath}`);
  }

  const outputTemplate =
    outputFormatOutputTemplate ??
    configuration.get<string>("outputPath.convertPdfToAvif", DEFAULT_PDF_OUTPUT_PATH);

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
