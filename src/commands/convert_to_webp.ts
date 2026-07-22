import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument } from 'pdf-lib';
import * as vscode from 'vscode';

import { isEditableDrawioImagePath, logicalSourcePathForOutputTemplate } from '../application/source_format.js';
import { readDrawioExecutablePath } from '../config/external_tool_paths.js';
import { readGhostscriptExecutablePath, readPdftocairoExecutablePath } from '../config/external_tool_paths.js';
import { readMermaidPuppeteerOptions } from '../config/mermaid_puppeteer_options.js';
import { readOutputFormatOutputTemplate } from '../config/output_path_settings.js';
import { resolveOutputPath } from '../config/resolve_output_path.js';
import {
  convertToWebpFiles,
  type ConvertToWebpJob,
  type DrawioToWebpOptions,
  type WebpOutputOptions,
} from '../operations/convert_to_webp.js';
import { assertExistingPathInWorkspace } from '../security/workspace_path.js';

import type { CommandDependencies } from './command_dependencies.js';
import { createOutputConversionMessages, runOutputConversion } from './run_output_conversion.js';
import { resolveOutputConflicts } from './safe_mode.js';
import { userMessage } from './user_messages.js';

export const CONVERT_TO_WEBP_COMMAND = 'latex-graphics-helper.convertToWebp';

const DEFAULT_OUTPUT_PATH = '${fileDirname}/${fileBasenameNoExtension}.webp';
const DEFAULT_PDF_OUTPUT_PATH = '${fileDirname}/${fileBasenameNoExtension}-${page}.webp';
const DEFAULT_DRAWIO_OUTPUT_PATH = '${fileDirname}/${fileBasenameNoExtension}/${page}.webp';
const DEFAULT_WEBP_EFFORT = 4;

export async function convertToWebpCommand(
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
  dependencies?: CommandDependencies,
): Promise<void> {
  const outputChannel = dependencies?.outputChannel;
  try {
    const sourceUris = selectedUris(uri, uris);

    if (sourceUris.length === 0) {
      throw new Error('No files were selected.');
    }

    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    const outputFormatOutputTemplate = readOutputFormatOutputTemplate(configuration, 'outputPath.convertToWebp');
    const jobs = (
      await Promise.all(sourceUris.map((sourceUri) => createJobs(sourceUri, configuration, outputFormatOutputTemplate)))
    ).flat();
    const mermaid = readMermaidPuppeteerOptions(configuration, 'convertToPdf');
    const drawio = readDrawioToWebpOptions(configuration);
    const webp = readWebpOutputOptions(configuration);
    const pdftocairoPath = readPdftocairoExecutablePath(configuration);
    const ghostscriptPath = readGhostscriptExecutablePath(configuration);
    await runOutputConversion({
      operationName: 'convert-to-webp',
      ...(outputChannel !== undefined && { outputChannel }),
      resolveConflicts: resolveOutputConflicts,
      messages: createOutputConversionMessages('WebP', sourceUris.length),
      run: (runtime) =>
        convertToWebpFiles({
          jobs,
          pdftocairoPath,
          ghostscriptPath,
          mermaid,
          drawio,
          webp,
          platform: process.platform,
          runtime,
        }),
    });
  } catch (error) {
    if (isAbortError(error)) {
      await vscode.window.showInformationMessage(userMessage('message.convertToOutput.cancelled', 'WebP'));
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(userMessage('message.convertToOutput.failed', 'WebP', message));
  }
}

async function createJobs(
  sourceUri: vscode.Uri,
  configuration: vscode.WorkspaceConfiguration,
  outputFormatOutputTemplate: string | undefined,
): Promise<ConvertToWebpJob[]> {
  if (sourceUri.scheme !== 'file') {
    throw new Error(`Only local files are supported: ${sourceUri.toString()}`);
  }

  const workspace = vscode.workspace.getWorkspaceFolder(sourceUri);

  if (!workspace) {
    throw new Error(`The file must be inside an open workspace: ${sourceUri.fsPath}`);
  }

  const sourcePath = sourceUri.fsPath;
  const extension = path.extname(sourcePath).toLowerCase();

  if (extension === '.webp' && !isEditableDrawioImagePath(sourcePath)) {
    throw new Error(`Unsupported input for WebP conversion: ${sourcePath}`);
  }

  if (extension === '.pdf') {
    await assertExistingPathInWorkspace(sourcePath, workspace.uri.fsPath);
    return createPdfJobs(sourcePath, workspace, configuration, outputFormatOutputTemplate);
  }

  const page = isEditableDrawioImagePath(sourcePath) ? '1' : undefined;
  const outputTemplate = outputTemplateForSource(sourcePath, configuration, outputFormatOutputTemplate);
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
    outputFormatOutputTemplate ?? configuration.get<string>('outputPath.convertPdfToWebp', DEFAULT_PDF_OUTPUT_PATH);

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
    return configuration.get<string>('outputPath.convertDrawioToWebp', DEFAULT_DRAWIO_OUTPUT_PATH);
  }

  switch (extension) {
    case '.png': {
      return configuration.get<string>('outputPath.convertPngToWebp', DEFAULT_OUTPUT_PATH);
    }
    case '.jpg':
    case '.jpeg': {
      return configuration.get<string>('outputPath.convertJpegToWebp', DEFAULT_OUTPUT_PATH);
    }
    case '.avif': {
      return configuration.get<string>('outputPath.convertAvifToWebp', DEFAULT_OUTPUT_PATH);
    }
    case '.svg': {
      return configuration.get<string>('outputPath.convertSvgToWebp', DEFAULT_OUTPUT_PATH);
    }
    case '.mmd':
    case '.mermaid': {
      return configuration.get<string>('outputPath.convertMermaidToWebp', DEFAULT_OUTPUT_PATH);
    }
    default: {
      return DEFAULT_OUTPUT_PATH;
    }
  }
}

function readDrawioToWebpOptions(configuration: vscode.WorkspaceConfiguration): DrawioToWebpOptions {
  return {
    drawioPath: readDrawioExecutablePath(configuration),
  };
}

function readWebpOutputOptions(configuration: vscode.WorkspaceConfiguration): WebpOutputOptions {
  const effort = configuration.get<number>('convertToWebp.effort', DEFAULT_WEBP_EFFORT);

  if (!Number.isInteger(effort) || effort < 0 || effort > 6) {
    throw new Error(`convertToWebp.effort must be an integer between 0 and 6: ${effort}`);
  }

  return { effort };
}

function selectedUris(uri?: vscode.Uri, uris?: vscode.Uri[]): vscode.Uri[] {
  const candidates = uris && uris.length > 0 ? uris : uri ? [uri] : [];
  const uniqueUris = new Map(candidates.map((candidate) => [candidate.toString(), candidate]));

  return [...uniqueUris.values()];
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
