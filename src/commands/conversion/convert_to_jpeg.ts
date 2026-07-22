import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument } from 'pdf-lib';
import * as vscode from 'vscode';

import {
  isEditableDrawioImagePath,
  logicalSourcePathForOutputTemplate,
} from '../../application/policy/source_format.js';
import {
  readGhostscriptExecutablePath,
  readPdftocairoExecutablePath,
} from '../../config/external_tools/external_tool_paths.js';
import { readMermaidPuppeteerOptions } from '../../config/rendering/mermaid_puppeteer_options.js';
import { readOutputFormatOutputTemplate } from '../../config/output/output_path_settings.js';
import { resolveOutputPath } from '../../config/output/resolve_output_path.js';
import { convertToJpegFiles, type ConvertToJpegJob } from '../../operations/conversion/convert_to_jpeg.js';
import { assertExistingPathInWorkspace } from '../../security/workspace_path.js';

import type { CommandDependencies } from '../shared/command_dependencies.js';
import { createOutputConversionMessages, runOutputConversion } from '../lifecycle/run_output_conversion.js';
import { resolveOutputConflicts } from '../lifecycle/safe_mode.js';
import { userMessage } from '../shared/user_messages.js';
import { assertLocalFileInWorkspace, isAbortError, readDrawioOptions, selectedUris } from '../shared/command_utils.js';

export const CONVERT_TO_JPEG_COMMAND = 'latex-graphics-helper.convertToJpeg';

const DEFAULT_OUTPUT_PATH = '${fileDirname}/${fileBasenameNoExtension}.jpeg';
const DEFAULT_PDF_OUTPUT_PATH = '${fileDirname}/${fileBasenameNoExtension}-${page}.jpeg';
const DEFAULT_DRAWIO_OUTPUT_PATH = '${fileDirname}/${fileBasenameNoExtension}/${page}.jpeg';

export async function convertToJpegCommand(
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
    const outputFormatOutputTemplate = readOutputFormatOutputTemplate(configuration, 'outputPath.convertToJpeg');
    const jobs = (
      await Promise.all(sourceUris.map((sourceUri) => createJobs(sourceUri, configuration, outputFormatOutputTemplate)))
    ).flat();
    const mermaid = readMermaidPuppeteerOptions(configuration, 'convertToPdf');
    const drawio = readDrawioOptions(configuration);
    const pdftocairoPath = readPdftocairoExecutablePath(configuration);
    const ghostscriptPath = readGhostscriptExecutablePath(configuration);
    await runOutputConversion({
      operationName: 'convert-to-jpeg',
      ...(outputChannel !== undefined && { outputChannel }),
      resolveConflicts: resolveOutputConflicts,
      messages: createOutputConversionMessages('JPEG', sourceUris.length),
      run: (runtime) =>
        convertToJpegFiles({
          jobs,
          pdftocairoPath,
          ghostscriptPath,
          mermaid,
          drawio,
          platform: process.platform,
          runtime,
        }),
    });
  } catch (error) {
    if (isAbortError(error)) {
      await vscode.window.showInformationMessage(userMessage('message.convertToOutput.cancelled', 'JPEG'));
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(userMessage('message.convertToOutput.failed', 'JPEG', message));
  }
}

async function createJobs(
  sourceUri: vscode.Uri,
  configuration: vscode.WorkspaceConfiguration,
  outputFormatOutputTemplate: string | undefined,
): Promise<ConvertToJpegJob[]> {
  const workspace = assertLocalFileInWorkspace(sourceUri);

  const sourcePath = sourceUri.fsPath;
  const extension = path.extname(sourcePath).toLowerCase();

  if ((extension === '.jpg' || extension === '.jpeg') && !isEditableDrawioImagePath(sourcePath)) {
    throw new Error(`Unsupported input for JPEG conversion: ${sourcePath}`);
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
): Promise<ConvertToJpegJob[]> {
  const document = await PDFDocument.load(await readFile(sourcePath));
  const pageCount = document.getPageCount();

  if (pageCount === 0) {
    throw new Error(`PDF has no pages: ${sourcePath}`);
  }

  const outputTemplate =
    outputFormatOutputTemplate ?? configuration.get<string>('outputPath.convertPdfToJpeg', DEFAULT_PDF_OUTPUT_PATH);

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
    return configuration.get<string>('outputPath.convertDrawioToJpeg', DEFAULT_DRAWIO_OUTPUT_PATH);
  }

  switch (extension) {
    case '.png': {
      return configuration.get<string>('outputPath.convertPngToJpeg', DEFAULT_OUTPUT_PATH);
    }
    case '.webp': {
      return configuration.get<string>('outputPath.convertWebpToJpeg', DEFAULT_OUTPUT_PATH);
    }
    case '.avif': {
      return configuration.get<string>('outputPath.convertAvifToJpeg', DEFAULT_OUTPUT_PATH);
    }
    case '.svg': {
      return configuration.get<string>('outputPath.convertSvgToJpeg', DEFAULT_OUTPUT_PATH);
    }
    case '.mmd':
    case '.mermaid': {
      return configuration.get<string>('outputPath.convertMermaidToJpeg', DEFAULT_OUTPUT_PATH);
    }
    default: {
      return DEFAULT_OUTPUT_PATH;
    }
  }
}
