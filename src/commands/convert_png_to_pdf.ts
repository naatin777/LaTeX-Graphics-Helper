import path from "node:path";

import * as vscode from "vscode";

import { readOutputFormatOutputTemplate } from "../config/output_path_settings.js";
import { resolveOutputPath } from "../config/resolve_output_path.js";
import {
  isEditableDrawioImagePath,
  logicalSourcePathForOutputTemplate,
} from "../application/source_format.js";
import type { LineOutputChannel } from "../operations/external_tool_ascii_scratch.js";
import {
  convertPngToPdfFiles,
  type ConvertPngToPdfJob,
  type DrawioToPdfOptions,
  type MermaidPuppeteerOptions,
  type SvgToPdfEngine,
  type SvgToPdfOptions,
} from "../operations/convert_png_to_pdf.js";
import { resolveOutputConflicts } from "./safe_mode.js";
import { runConversionCommand } from "./run_conversion_command.js";
import { userMessage } from "./user_messages.js";

export const CONVERT_PNG_TO_PDF_COMMAND = "latex-graphics-helper.convertPngToPdf";
export const CONVERT_TO_PDF_COMMAND = "latex-graphics-helper.convertToPdf";

const DEFAULT_OUTPUT_PATH = "${fileDirname}/${fileBasenameNoExtension}.pdf";
const PNG_EXTENSIONS = [".png"] as const;
const PDF_IMAGE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".avif",
  ".svg",
  ".mmd",
  ".mermaid",
  ".drawio.png",
  ".dio.png",
  ".drawio.svg",
  ".dio.svg",
] as const;

export async function convertPngToPdfCommand(
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
  outputChannel?: LineOutputChannel,
): Promise<void> {
  await convertSelectedPngFilesToPdf(uri, uris, {
    supportedExtensions: PNG_EXTENSIONS,
    titleKey: "message.progress.convertPngToPdf.title",
    successKey: "message.convertPngToPdf.success",
    failedKey: "message.convertPngToPdf.failed",
    cancelledKey: "message.convertPngToPdf.cancelled",
    operationName: "convert-png-to-pdf",
    ...(outputChannel !== undefined && { outputChannel }),
  });
}

export async function convertToPdfCommand(
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
  outputChannel?: LineOutputChannel,
): Promise<void> {
  await convertSelectedPngFilesToPdf(uri, uris, {
    supportedExtensions: PDF_IMAGE_EXTENSIONS,
    titleKey: "message.progress.convertToPdf.title",
    successKey: "message.convertToPdf.success",
    failedKey: "message.convertToPdf.failed",
    cancelledKey: "message.convertToPdf.cancelled",
    outputFormatOutputPathKey: "outputPath.convertToPdf",
    operationName: "convert-to-pdf",
    ...(outputChannel !== undefined && { outputChannel }),
  });
}

async function convertSelectedPngFilesToPdf(
  uri: vscode.Uri | undefined,
  uris: vscode.Uri[] | undefined,
  messages: {
    supportedExtensions: readonly string[];
    titleKey: "message.progress.convertPngToPdf.title" | "message.progress.convertToPdf.title";
    successKey: "message.convertPngToPdf.success" | "message.convertToPdf.success";
    failedKey: "message.convertPngToPdf.failed" | "message.convertToPdf.failed";
    cancelledKey: "message.convertPngToPdf.cancelled" | "message.convertToPdf.cancelled";
    outputFormatOutputPathKey?: "outputPath.convertToPdf";
    operationName: string;
    outputChannel?: LineOutputChannel;
  },
): Promise<void> {
  try {
    const sourceUris = selectedUris(uri, uris);

    if (sourceUris.length === 0) {
      throw new Error("No files were selected.");
    }

    const configuration = vscode.workspace.getConfiguration("latex-graphics-helper");
    const outputTemplate = configuration.get<string>(
      "outputPath.convertPngToPdf",
      DEFAULT_OUTPUT_PATH,
    );
    const outputFormatOutputTemplate =
      messages.outputFormatOutputPathKey === undefined
        ? undefined
        : readOutputFormatOutputTemplate(configuration, messages.outputFormatOutputPathKey);
    const svgToPdf = readSvgToPdfOptions(configuration);
    const mermaid = readMermaidPuppeteerOptions(configuration);
    const drawio = readDrawioToPdfOptions(configuration);
    const jobs = sourceUris.map((sourceUri) =>
      createJob(
        sourceUri,
        outputTemplateForSource(
          sourceUri,
          configuration,
          outputTemplate,
          outputFormatOutputTemplate,
        ),
        logicalSourcePathForOutputTemplate(sourceUri.fsPath),
        messages.supportedExtensions,
      ),
    );
    await runConversionCommand({
      operationName: messages.operationName,
      ...(messages.outputChannel !== undefined && { outputChannel: messages.outputChannel }),
      messages: {
        progressTitle: userMessage(messages.titleKey, jobs.length),
        prepareMessage: userMessage("message.progress.prepareConversion", "PDF"),
        successMessage: (count) => userMessage(messages.successKey, count),
        undoUnavailableMessage: (success, reason) =>
          userMessage("message.undoUnavailable", success, reason),
        cancelledMessage: userMessage(messages.cancelledKey),
        failedMessage: (reason) => userMessage(messages.failedKey, reason),
      },
      run: (signal) =>
        convertPngToPdfFiles({
          jobs,
          signal,
          resolveOutputConflicts,
          supportedExtensions: messages.supportedExtensions,
          svgToPdf,
          mermaid,
          drawio,
          operationName: messages.operationName,
          ...(messages.outputChannel !== undefined && { outputChannel: messages.outputChannel }),
        }),
    });
  } catch (error) {
    if (isAbortError(error)) {
      await vscode.window.showInformationMessage(userMessage(messages.cancelledKey));
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(userMessage(messages.failedKey, message));
  }
}

function outputTemplateForSource(
  sourceUri: vscode.Uri,
  configuration: vscode.WorkspaceConfiguration,
  pngOutputTemplate: string,
  outputFormatOutputTemplate: string | undefined,
): string {
  if (outputFormatOutputTemplate !== undefined) {
    return outputFormatOutputTemplate;
  }

  const sourcePath = sourceUri.fsPath;
  const extension = path.extname(sourcePath).toLowerCase();

  if (isEditableDrawioImagePath(sourcePath)) {
    return configuration.get<string>("outputPath.convertDrawioToPdf", DEFAULT_OUTPUT_PATH);
  }

  switch (extension) {
    case ".png": {
      return pngOutputTemplate;
    }
    case ".jpg":
    case ".jpeg": {
      return configuration.get<string>("outputPath.convertJpegToPdf", DEFAULT_OUTPUT_PATH);
    }
    case ".webp": {
      return configuration.get<string>("outputPath.convertWebpToPdf", DEFAULT_OUTPUT_PATH);
    }
    case ".avif": {
      return configuration.get<string>("outputPath.convertAvifToPdf", DEFAULT_OUTPUT_PATH);
    }
    case ".svg": {
      return configuration.get<string>("outputPath.convertSvgToPdf", DEFAULT_OUTPUT_PATH);
    }
    case ".mmd":
    case ".mermaid": {
      return configuration.get<string>("outputPath.convertMermaidToPdf", DEFAULT_OUTPUT_PATH);
    }
    default: {
      return DEFAULT_OUTPUT_PATH;
    }
  }
}

function readSvgToPdfOptions(configuration: vscode.WorkspaceConfiguration): SvgToPdfOptions {
  const executablePath = configuration
    .get<string>("convertToPdf.svg.puppeteer.executablePath", "")
    .trim();

  return {
    engine: configuration.get<SvgToPdfEngine>("convertToPdf.svg.engine", "puppeteer"),
    rsvgConvertPath: configuration.get<string>("execPath.rsvgConvert", "rsvg-convert"),
    puppeteerBrowserChannel: configuration.get(
      "convertToPdf.svg.puppeteer.browserChannel",
      "chrome",
    ),
    ...(executablePath ? { puppeteerExecutablePath: executablePath } : {}),
  };
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

function readDrawioToPdfOptions(configuration: vscode.WorkspaceConfiguration): DrawioToPdfOptions {
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

function createJob(
  sourceUri: vscode.Uri,
  outputTemplate: string,
  templateSourcePath: string,
  supportedExtensions: readonly string[],
): ConvertPngToPdfJob {
  if (sourceUri.scheme !== "file") {
    throw new Error(`Only local image files are supported: ${sourceUri.toString()}`);
  }

  const workspace = vscode.workspace.getWorkspaceFolder(sourceUri);

  if (!workspace) {
    throw new Error(`The image must be inside an open workspace: ${sourceUri.fsPath}`);
  }

  const lowerSourcePath = sourceUri.fsPath.toLowerCase();
  if (!supportedExtensions.some((extension) => lowerSourcePath.endsWith(extension))) {
    throw new Error(`Unsupported input format: ${sourceUri.fsPath}`);
  }

  return {
    sourcePath: sourceUri.fsPath,
    workspacePath: workspace.uri.fsPath,
    outputPath: resolveOutputPath(outputTemplate, {
      sourcePath: templateSourcePath,
      workspacePath: workspace.uri.fsPath,
      workspaceName: workspace.name,
    }),
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
