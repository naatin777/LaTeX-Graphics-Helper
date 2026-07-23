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
import { convertToGifFiles, type ConvertToGifJob } from '../../operations/conversion/convert_to_gif.js';
import { assertExistingPathInWorkspace } from '../../security/workspace_path.js';
import { createRasterFrameJobs, readRasterAnimationMetadata } from './create_raster_frame_jobs.js';
import type { CommandDependencies } from '../shared/command_dependencies.js';
import { createOutputConversionMessages, runOutputConversion } from '../lifecycle/run_output_conversion.js';
import { resolveOutputConflicts } from '../lifecycle/safe_mode.js';
import { userMessage } from '../shared/user_messages.js';
import {
  abortError,
  assertFileScheme,
  isAbortError,
  readDrawioOptions,
  selectedUris,
} from '../shared/command_utils.js';

export const CONVERT_TO_GIF_COMMAND = 'latex-graphics-helper.convertToGif';

const DEFAULT_OUTPUT_PATH = '${fileDirname}/${fileBasenameNoExtension}.gif';
const DEFAULT_PDF_OUTPUT_PATH = '${fileDirname}/${fileBasenameNoExtension}-${page}.gif';
const DEFAULT_DRAWIO_OUTPUT_PATH = '${fileDirname}/${fileBasenameNoExtension}/${page}.gif';

export async function convertToGifCommand(
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
    const outputFormatOutputTemplate = readOutputFormatOutputTemplate(configuration, 'outputPath.convertToGif');
    const maxInputPixels = getMaxInputPixels(configuration);
    const jobs = (
      await Promise.all(
        sourceUris.map((sourceUri) => createJobs(sourceUri, configuration, outputFormatOutputTemplate, maxInputPixels)),
      )
    ).flat();
    await runOutputConversion({
      operationName: 'convert-to-gif',
      ...(outputChannel !== undefined && { outputChannel }),
      resolveConflicts: resolveOutputConflicts,
      messages: createOutputConversionMessages('GIF', sourceUris.length),
      run: (runtime) =>
        convertToGifFiles({
          jobs,
          maxInputPixels,
          pdftocairoPath: readPdftocairoExecutablePath(configuration),
          ghostscriptPath: readGhostscriptExecutablePath(configuration),
          mermaid: readMermaidPuppeteerOptions(configuration, 'convertToPdf'),
          drawio: readDrawioOptions(configuration),
          platform: process.platform,
          runtime,
        }),
    });
  } catch (error) {
    if (isAbortError(error)) {
      await vscode.window.showInformationMessage(userMessage('message.convertToOutput.cancelled', 'GIF'));
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(userMessage('message.convertToOutput.failed', 'GIF', message));
  }
}

async function createJobs(
  sourceUri: vscode.Uri,
  configuration: vscode.WorkspaceConfiguration,
  configuredTemplate: string | undefined,
  maxInputPixels: number,
): Promise<ConvertToGifJob[]> {
  assertFileScheme(sourceUri);
  const workspace = vscode.workspace.getWorkspaceFolder(sourceUri);
  if (!workspace) {
    throw new Error(`The file must be inside an open workspace: ${sourceUri.fsPath}`);
  }
  const sourcePath = sourceUri.fsPath;
  const extension = path.extname(sourcePath).toLowerCase();
  if (extension === '.gif' && !isEditableDrawioImagePath(sourcePath)) {
    throw new Error(`Unsupported input for GIF conversion: ${sourcePath}`);
  }
  if (extension === '.pdf') {
    await assertExistingPathInWorkspace(sourcePath, workspace.uri.fsPath);
    return createPdfJobs(sourcePath, workspace, configuration, configuredTemplate);
  }
  const outputTemplate = outputTemplateForSource(sourcePath, configuration, configuredTemplate);
  if (isRasterImagePath(sourcePath)) {
    if (extension === '.webp') {
      const animation = await readRasterAnimationMetadata(sourcePath, maxInputPixels);
      if (animation !== undefined) {
        const mode = await chooseWebpAnimationMode(sourcePath);
        if (mode === 'preserve') {
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
                { allowedExtensions: ['.gif'] },
              ),
              animation,
            },
          ];
        }
      }
    }
    return createRasterFrameJobs({
      sourcePath,
      workspacePath: workspace.uri.fsPath,
      workspaceName: workspace.name,
      outputTemplate,
      allowedExtensions: ['.gif'],
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
        { allowedExtensions: ['.gif'] },
      ),
      ...(page !== undefined && { page: Number(page) }),
    },
  ];
}

async function chooseWebpAnimationMode(sourcePath: string): Promise<'preserve' | 'split'> {
  const selected = await vscode.window.showQuickPick(
    [
      {
        label: 'Preserve animation',
        description: 'Create one animated GIF and retain frame timing and loop count.',
        mode: 'preserve' as const,
      },
      { label: 'Split frames', description: 'Create one GIF file per WebP frame.', mode: 'split' as const },
    ],
    {
      title: `Animated WebP: ${path.basename(sourcePath)}`,
      placeHolder: 'Choose how to convert the animation',
      ignoreFocusOut: true,
    },
  );
  if (selected === undefined) {
    throw abortError('Animated WebP conversion cancelled.');
  }
  return selected.mode;
}

async function createPdfJobs(
  sourcePath: string,
  workspace: vscode.WorkspaceFolder,
  configuration: vscode.WorkspaceConfiguration,
  configuredTemplate: string | undefined,
): Promise<ConvertToGifJob[]> {
  const pageCount = (await PDFDocument.load(await readFile(sourcePath))).getPageCount();
  if (pageCount === 0) {
    throw new Error(`PDF has no pages: ${sourcePath}`);
  }
  const outputTemplate =
    configuredTemplate ?? configuration.get<string>('outputPath.convertPdfToGif', DEFAULT_PDF_OUTPUT_PATH);
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
        { allowedExtensions: ['.gif'] },
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
    return configuration.get<string>('outputPath.convertDrawioToGif', DEFAULT_DRAWIO_OUTPUT_PATH);
  }
  switch (path.extname(sourcePath).toLowerCase()) {
    case '.png':
      return configuration.get<string>('outputPath.convertPngToGif', DEFAULT_OUTPUT_PATH);
    case '.jpg':
    case '.jpeg':
      return configuration.get<string>('outputPath.convertJpegToGif', DEFAULT_OUTPUT_PATH);
    case '.webp':
      return configuration.get<string>('outputPath.convertWebpToGif', DEFAULT_OUTPUT_PATH);
    case '.avif':
      return configuration.get<string>('outputPath.convertAvifToGif', DEFAULT_OUTPUT_PATH);
    case '.tif':
    case '.tiff':
      return configuration.get<string>('outputPath.convertTiffToGif', DEFAULT_OUTPUT_PATH);
    case '.svg':
      return configuration.get<string>('outputPath.convertSvgToGif', DEFAULT_OUTPUT_PATH);
    case '.mmd':
    case '.mermaid':
      return configuration.get<string>('outputPath.convertMermaidToGif', DEFAULT_OUTPUT_PATH);
    default:
      return DEFAULT_OUTPUT_PATH;
  }
}
