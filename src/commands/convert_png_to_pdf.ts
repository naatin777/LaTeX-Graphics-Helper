import path from "node:path";

import * as vscode from "vscode";

import { resolveOutputPath } from "../config/resolve_output_path.js";
import {
  convertPngToPdfFiles,
  type ConvertPngToPdfJob,
  type MermaidPuppeteerOptions,
  type SvgToPdfEngine,
  type SvgToPdfOptions,
} from "../operations/convert_png_to_pdf.js";
import { resolveOutputConflicts } from "./safe_mode.js";
import { rememberLastConversion, UNDO_LAST_CONVERSION_COMMAND } from "./undo_last_conversion.js";

export const CONVERT_PNG_TO_PDF_COMMAND = "latex-graphics-helper.convertPngToPdf";
export const CONVERT_TO_PDF_COMMAND = "latex-graphics-helper.convertToPdf";

const DEFAULT_OUTPUT_PATH = "${fileDirname}/${fileBasenameNoExtension}.pdf";
const UNDO_ACTION = "Undo";
const PNG_EXTENSIONS = [".png"] as const;
const MERMAID_EXTENSIONS = [".mmd", ".mermaid"] as const;
const PDF_IMAGE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".avif",
  ".svg",
  ...MERMAID_EXTENSIONS,
] as const;

export async function convertPngToPdfCommand(uri?: vscode.Uri, uris?: vscode.Uri[]): Promise<void> {
  await convertSelectedPngFilesToPdf(uri, uris, {
    supportedExtensions: PNG_EXTENSIONS,
    titleInputName: "PNG",
    successInputName: "PNG",
    errorPrefix: "Failed to convert PNG to PDF",
    cancelMessage: "PNG conversion was cancelled.",
  });
}

export async function convertToPdfCommand(uri?: vscode.Uri, uris?: vscode.Uri[]): Promise<void> {
  await convertSelectedPngFilesToPdf(uri, uris, {
    supportedExtensions: PDF_IMAGE_EXTENSIONS,
    titleInputName: "selected",
    successInputName: "file",
    errorPrefix: "Failed to convert to PDF",
    cancelMessage: "PDF conversion was cancelled.",
  });
}

async function convertSelectedPngFilesToPdf(
  uri: vscode.Uri | undefined,
  uris: vscode.Uri[] | undefined,
  messages: {
    supportedExtensions: readonly string[];
    titleInputName: string;
    successInputName: string;
    errorPrefix: string;
    cancelMessage: string;
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
    const svgToPdf = readSvgToPdfOptions(configuration);
    const mermaid = readMermaidPuppeteerOptions(configuration);
    const jobs = sourceUris.map((sourceUri) =>
      createJob(sourceUri, outputTemplateForSource(sourceUri, configuration, outputTemplate)),
    );
    const outputs = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Converting ${jobs.length} ${messages.titleInputName} file(s) to PDF`,
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
          return await convertPngToPdfFiles({
            jobs,
            signal: abortController.signal,
            resolveOutputConflicts,
            supportedExtensions: messages.supportedExtensions,
            svgToPdf,
            mermaid,
          });
        } finally {
          cancellationSubscription.dispose();
        }
      },
    );

    const successMessage = `Converted ${outputs.length} ${messages.successInputName} file(s) to PDF.`;
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
      await vscode.window.showInformationMessage(messages.cancelMessage);
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(`${messages.errorPrefix}: ${message}`);
  }
}

function outputTemplateForSource(
  sourceUri: vscode.Uri,
  configuration: vscode.WorkspaceConfiguration,
  pngOutputTemplate: string,
): string {
  const extension = path.extname(sourceUri.fsPath).toLowerCase();

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

function selectedUris(uri?: vscode.Uri, uris?: vscode.Uri[]): vscode.Uri[] {
  const candidates = uris && uris.length > 0 ? uris : uri ? [uri] : [];
  const uniqueUris = new Map(candidates.map((candidate) => [candidate.toString(), candidate]));

  return [...uniqueUris.values()];
}

function createJob(sourceUri: vscode.Uri, outputTemplate: string): ConvertPngToPdfJob {
  if (sourceUri.scheme !== "file") {
    throw new Error(`Only local image files are supported: ${sourceUri.toString()}`);
  }

  const workspace = vscode.workspace.getWorkspaceFolder(sourceUri);

  if (!workspace) {
    throw new Error(`The image must be inside an open workspace: ${sourceUri.fsPath}`);
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

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
