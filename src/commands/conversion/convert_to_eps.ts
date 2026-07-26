import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument } from 'pdf-lib';
import * as vscode from 'vscode';

import { isRasterImagePath, logicalSourcePathForOutputTemplate } from '../../application/policy/source_format.js';
import { readGhostscriptExecutablePath } from '../../config/external_tools/external_tool_paths.js';
import { getMaxInputPixels } from '../../config/raster_input.js';
import { readMermaidPuppeteerOptions } from '../../config/rendering/mermaid_puppeteer_options.js';
import { readOutputPathTemplate, readOutputPathsTemplate } from '../../config/output/output_path_settings.js';
import { assertPageTemplateForSplitOutput, formatOutputPage } from '../../config/output/page_template.js';
import { resolveOutputPath } from '../../config/output/resolve_output_path.js';
import { convertToEpsFiles, type ConvertToEpsJob } from '../../operations/conversion/convert_to_eps.js';
import { assertExistingPathInWorkspace } from '../../security/workspace_path.js';
import { createOutputConversionMessages, runOutputConversion } from '../lifecycle/run_output_conversion.js';
import { resolveOutputConflicts } from '../lifecycle/safe_mode.js';
import type { CommandDependencies } from '../shared/command_dependencies.js';
import { assertFileScheme, isAbortError, selectedUris } from '../shared/command_utils.js';
import { createRasterFrameJobs } from './create_raster_frame_jobs.js';
import { readSvgToPdfOptions } from './convert_to_pdf.js';

export const CONVERT_TO_EPS_COMMAND = 'latex-graphics-helper.convertToEps';
const DEFAULT_OUTPUT_PATH = '${fileDirname}/${fileBasenameNoExtension}.eps';
const DEFAULT_PDF_OUTPUT_PATH = '${fileDirname}/${fileBasenameNoExtension}-${page}.eps';

export async function convertToEpsCommand(
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
  dependencies?: CommandDependencies,
): Promise<void> {
  try {
    const sourceUris = selectedUris(uri, uris);
    if (sourceUris.length === 0) {
      throw new Error('No files were selected.');
    }
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    const jobs = (await Promise.all(sourceUris.map((sourceUri) => createEpsJobs(sourceUri, configuration)))).flat();
    const svgToPdfTools = readSvgToPdfOptions(configuration);
    await runOutputConversion({
      operationName: 'convert-to-eps',
      ...(dependencies?.outputChannel === undefined ? {} : { outputChannel: dependencies.outputChannel }),
      resolveConflicts: resolveOutputConflicts,
      messages: createOutputConversionMessages('EPS', sourceUris.length),
      run: (runtime) =>
        convertToEpsFiles({
          jobs,
          runtime,
          ghostscriptPath: readGhostscriptExecutablePath(configuration),
          svgToPdfTools,
          mermaidTools: readMermaidPuppeteerOptions(configuration, 'convertToPdf'),
          maxInputPixels: getMaxInputPixels(configuration),
          platform: process.platform,
        }),
    });
  } catch (error) {
    if (isAbortError(error)) {
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(`Failed to convert to EPS: ${message}`);
  }
}

export async function createEpsJobs(
  sourceUri: vscode.Uri,
  configuration: vscode.WorkspaceConfiguration,
): Promise<ConvertToEpsJob[]> {
  assertFileScheme(sourceUri);
  const workspace = vscode.workspace.getWorkspaceFolder(sourceUri);
  if (!workspace) {
    throw new Error(`The file must be inside an open workspace: ${sourceUri.fsPath}`);
  }
  const sourcePath = sourceUri.fsPath;
  if (path.extname(sourcePath).toLowerCase() === '.pdf') {
    await assertExistingPathInWorkspace(sourcePath, workspace.uri.fsPath);
    const pageCount = (await PDFDocument.load(await readFile(sourcePath))).getPageCount();
    if (pageCount === 0) {
      throw new Error(`PDF has no pages: ${sourcePath}`);
    }
    const template = readOutputPathsTemplate(configuration, 'convertPdfToEps', DEFAULT_PDF_OUTPUT_PATH);
    assertPageTemplateForSplitOutput(template, pageCount);
    return Array.from({ length: pageCount }, (_value, index) =>
      createJob(sourcePath, workspace, template, index + 1, pageCount),
    );
  }

  const outputTemplate = outputPathTemplateForSource(sourcePath, configuration);

  if (isRasterImagePath(sourcePath)) {
    return createRasterFrameJobs({
      sourcePath,
      workspacePath: workspace.uri.fsPath,
      workspaceName: workspace.name,
      outputTemplate,
      allowedExtensions: ['.eps'],
      maxInputPixels: getMaxInputPixels(configuration),
      createJob: (job) => job,
    });
  }
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
        },
        { allowedExtensions: ['.eps'] },
      ),
    },
  ];
}

function outputPathTemplateForSource(sourcePath: string, configuration: vscode.WorkspaceConfiguration): string {
  switch (path.extname(sourcePath).toLowerCase()) {
    case '.png':
      return readOutputPathTemplate(configuration, 'outputPath.convertPngToEps', DEFAULT_OUTPUT_PATH);
    case '.jpg':
    case '.jpeg':
      return readOutputPathTemplate(configuration, 'outputPath.convertJpegToEps', DEFAULT_OUTPUT_PATH);
    case '.webp':
      return readOutputPathTemplate(configuration, 'outputPath.convertWebpToEps', DEFAULT_OUTPUT_PATH);
    case '.avif':
      return readOutputPathTemplate(configuration, 'outputPath.convertAvifToEps', DEFAULT_OUTPUT_PATH);
    case '.svg':
      return readOutputPathTemplate(configuration, 'outputPath.convertSvgToEps', DEFAULT_OUTPUT_PATH);
    case '.mmd':
    case '.mermaid':
      return readOutputPathTemplate(configuration, 'outputPath.convertMermaidToEps', DEFAULT_OUTPUT_PATH);
    default:
      return DEFAULT_OUTPUT_PATH;
  }
}

function createJob(
  sourcePath: string,
  workspace: vscode.WorkspaceFolder,
  template: string,
  page: number,
  totalPages: number,
): ConvertToEpsJob {
  return {
    sourcePath,
    workspacePath: workspace.uri.fsPath,
    outputPath: resolveOutputPath(
      template,
      {
        sourcePath,
        workspacePath: workspace.uri.fsPath,
        workspaceName: workspace.name,
        page: formatOutputPage(page, totalPages),
      },
      { allowedExtensions: ['.eps'] },
    ),
    page,
  };
}
