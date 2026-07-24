import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument } from 'pdf-lib';
import * as vscode from 'vscode';

import {
  isEditableDrawioImagePath,
  isRasterImagePath,
  logicalSourcePathForOutputTemplate,
} from '../../application/policy/source_format.js';
import {
  readGhostscriptExecutablePath,
  readPdftocairoExecutablePath,
} from '../../config/external_tools/external_tool_paths.js';
import { getMaxInputPixels } from '../../config/raster_input.js';
import { readMermaidPuppeteerOptions } from '../../config/rendering/mermaid_puppeteer_options.js';
import { readOutputFormatOutputTemplate } from '../../config/output/output_path_settings.js';
import { resolveOutputPath } from '../../config/output/resolve_output_path.js';
import { assertPageTemplateForSplitOutput, formatOutputPage } from '../../config/output/page_template.js';
import { convertToTiffFiles, type ConvertToTiffJob } from '../../operations/conversion/convert_to_tiff.js';
import { assertExistingPathInWorkspace } from '../../security/workspace_path.js';
import { createRasterFrameJobs } from './create_raster_frame_jobs.js';
import type { CommandDependencies } from '../shared/command_dependencies.js';
import { createOutputConversionMessages, runOutputConversion } from '../lifecycle/run_output_conversion.js';
import { resolveOutputConflicts } from '../lifecycle/safe_mode.js';
import { userMessage } from '../shared/user_messages.js';
import { assertFileScheme, isAbortError, readDrawioOptions, selectedUris } from '../shared/command_utils.js';

export const CONVERT_TO_TIFF_COMMAND = 'latex-graphics-helper.convertToTiff';

const DEFAULT_OUTPUT_PATH = '${fileDirname}/${fileBasenameNoExtension}.tiff';
const DEFAULT_PDF_OUTPUT_PATH = '${fileDirname}/${fileBasenameNoExtension}-${page}.tiff';
const DEFAULT_DRAWIO_OUTPUT_PATH = '${fileDirname}/${fileBasenameNoExtension}/${page}.tiff';

export async function convertToTiffCommand(
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
    const outputFormatOutputTemplate = readOutputFormatOutputTemplate(configuration, 'outputPath.convertToTiff');
    const maxInputPixels = getMaxInputPixels(configuration);
    const jobs = (
      await Promise.all(
        sourceUris.map((sourceUri) => createJobs(sourceUri, configuration, outputFormatOutputTemplate, maxInputPixels)),
      )
    ).flat();
    await runOutputConversion({
      operationName: 'convert-to-tiff',
      ...(outputChannel !== undefined && { outputChannel }),
      resolveConflicts: resolveOutputConflicts,
      messages: createOutputConversionMessages('TIFF', sourceUris.length),
      run: (runtime) =>
        convertToTiffFiles({
          jobs,
          maxInputPixels,
          pdftocairoTools: { pdftocairoPath: readPdftocairoExecutablePath(configuration), platform: process.platform },
          ghostscriptTools: {
            ghostscriptPath: readGhostscriptExecutablePath(configuration),
            platform: process.platform,
          },
          mermaidTools: readMermaidPuppeteerOptions(configuration, 'convertToPdf'),
          drawioTools: readDrawioOptions(configuration),
          runtime,
        }),
    });
  } catch (error) {
    if (isAbortError(error)) {
      await vscode.window.showInformationMessage(userMessage('message.convertToOutput.cancelled', 'TIFF'));
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(userMessage('message.convertToOutput.failed', 'TIFF', message));
  }
}

async function createJobs(
  sourceUri: vscode.Uri,
  configuration: vscode.WorkspaceConfiguration,
  configuredTemplate: string | undefined,
  maxInputPixels: number,
): Promise<ConvertToTiffJob[]> {
  assertFileScheme(sourceUri);
  const workspace = vscode.workspace.getWorkspaceFolder(sourceUri);
  if (!workspace) {
    throw new Error(`The file must be inside an open workspace: ${sourceUri.fsPath}`);
  }
  const sourcePath = sourceUri.fsPath;
  const extension = path.extname(sourcePath).toLowerCase();
  if ((extension === '.tif' || extension === '.tiff') && !isEditableDrawioImagePath(sourcePath)) {
    throw new Error(`Unsupported input for TIFF conversion: ${sourcePath}`);
  }
  if (extension === '.pdf') {
    await assertExistingPathInWorkspace(sourcePath, workspace.uri.fsPath);
    return createPdfJobs(sourcePath, workspace, configuration, configuredTemplate);
  }
  const outputTemplate = outputTemplateForSource(sourcePath, configuration, configuredTemplate);
  if (isRasterImagePath(sourcePath)) {
    return createRasterFrameJobs({
      sourcePath,
      workspacePath: workspace.uri.fsPath,
      workspaceName: workspace.name,
      outputTemplate,
      allowedExtensions: ['.tif', '.tiff'],
      maxInputPixels,
      createJob: (job) => job,
    });
  }
  const page = isEditableDrawioImagePath(sourcePath) ? '1' : undefined;
  return [
    {
      sourcePath,
      workspacePath: workspace.uri.fsPath,
      outputPath: resolveOutputPath(
        outputTemplate,
        {
          sourcePath: logicalSourcePathForOutputTemplate(sourcePath),
          workspacePath: workspace.uri.fsPath,
          workspaceName: workspace.name,
          ...(page !== undefined && { page }),
        },
        { allowedExtensions: ['.tif', '.tiff'] },
      ),
      ...(page !== undefined && { page: Number(page) }),
    },
  ];
}

async function createPdfJobs(
  sourcePath: string,
  workspace: vscode.WorkspaceFolder,
  configuration: vscode.WorkspaceConfiguration,
  configuredTemplate: string | undefined,
): Promise<ConvertToTiffJob[]> {
  const pageCount = (await PDFDocument.load(await readFile(sourcePath))).getPageCount();
  if (pageCount === 0) {
    throw new Error(`PDF has no pages: ${sourcePath}`);
  }
  const outputTemplate =
    configuredTemplate ?? configuration.get<string>('outputPath.convertPdfToTiff', DEFAULT_PDF_OUTPUT_PATH);
  assertPageTemplateForSplitOutput(outputTemplate, pageCount);
  return Array.from({ length: pageCount }, (_value, index) => {
    const page = index + 1;
    return {
      sourcePath,
      workspacePath: workspace.uri.fsPath,
      outputPath: resolveOutputPath(
        outputTemplate,
        {
          sourcePath,
          workspacePath: workspace.uri.fsPath,
          workspaceName: workspace.name,
          page: formatOutputPage(page, pageCount),
        },
        { allowedExtensions: ['.tif', '.tiff'] },
      ),
      page,
    };
  });
}

function outputTemplateForSource(
  sourcePath: string,
  configuration: vscode.WorkspaceConfiguration,
  configuredTemplate: string | undefined,
): string {
  if (configuredTemplate !== undefined) {
    return configuredTemplate;
  }
  if (isEditableDrawioImagePath(sourcePath)) {
    return configuration.get<string>('outputPath.convertDrawioToTiff', DEFAULT_DRAWIO_OUTPUT_PATH);
  }
  switch (path.extname(sourcePath).toLowerCase()) {
    case '.png':
      return configuration.get<string>('outputPath.convertPngToTiff', DEFAULT_OUTPUT_PATH);
    case '.jpg':
    case '.jpeg':
      return configuration.get<string>('outputPath.convertJpegToTiff', DEFAULT_OUTPUT_PATH);
    case '.webp':
      return configuration.get<string>('outputPath.convertWebpToTiff', DEFAULT_OUTPUT_PATH);
    case '.avif':
      return configuration.get<string>('outputPath.convertAvifToTiff', DEFAULT_OUTPUT_PATH);
    case '.gif':
      return configuration.get<string>('outputPath.convertGifToTiff', DEFAULT_OUTPUT_PATH);
    case '.svg':
      return configuration.get<string>('outputPath.convertSvgToTiff', DEFAULT_OUTPUT_PATH);
    case '.mmd':
    case '.mermaid':
      return configuration.get<string>('outputPath.convertMermaidToTiff', DEFAULT_OUTPUT_PATH);
    default:
      return DEFAULT_OUTPUT_PATH;
  }
}
