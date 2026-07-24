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
import {
  convertToWebpFiles,
  type ConvertToWebpJob,
  type WebpOutputOptions,
} from '../../operations/conversion/convert_to_webp.js';
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
    const maxInputPixels = getMaxInputPixels(configuration);
    const jobs = (
      await Promise.all(
        sourceUris.map((sourceUri) => createJobs(sourceUri, configuration, outputFormatOutputTemplate, maxInputPixels)),
      )
    ).flat();
    const mermaid = readMermaidPuppeteerOptions(configuration, 'convertToPdf');
    const drawio = readDrawioOptions(configuration);
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
          maxInputPixels,
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
  maxInputPixels: number,
): Promise<ConvertToWebpJob[]> {
  assertFileScheme(sourceUri);
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
  if (isRasterImagePath(sourcePath)) {
    if (extension === '.gif') {
      const animation = await readRasterAnimationMetadata(sourcePath, maxInputPixels);
      if (animation !== undefined) {
        const mode = await chooseGifAnimationMode(sourcePath);
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
                { allowedExtensions: ['.webp'] },
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
      allowedExtensions: ['.webp'],
      maxInputPixels,
      createJob: (job) => job,
    });
  }
  const outputPath = resolveOutputPath(
    outputTemplate,
    {
      sourcePath: logicalSourcePathForOutputTemplate(sourcePath),
      workspacePath: workspace.uri.fsPath,
      workspaceName: workspace.name,
      ...(page !== undefined && { page }),
    },
    { allowedExtensions: ['.webp'] },
  );

  return [
    {
      sourcePath,
      workspacePath: workspace.uri.fsPath,
      outputPath,
      ...(page !== undefined && { page: Number(page) }),
    },
  ];
}

async function chooseGifAnimationMode(sourcePath: string): Promise<'preserve' | 'split'> {
  const selected = await vscode.window.showQuickPick(
    [
      {
        label: 'Preserve animation',
        description: 'Create one animated WebP and retain frame timing and loop count.',
        mode: 'preserve' as const,
      },
      {
        label: 'Split frames',
        description: 'Create one WebP file per GIF frame.',
        mode: 'split' as const,
      },
    ],
    {
      title: `Animated GIF: ${path.basename(sourcePath)}`,
      placeHolder: 'Choose how to convert the animation',
      ignoreFocusOut: true,
    },
  );

  if (selected === undefined) {
    throw abortError('Animated GIF conversion cancelled.');
  }

  return selected.mode;
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
        { allowedExtensions: ['.webp'] },
      ),
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

function readWebpOutputOptions(configuration: vscode.WorkspaceConfiguration): WebpOutputOptions {
  const effort = configuration.get<number>('convertToWebp.effort', DEFAULT_WEBP_EFFORT);

  if (!Number.isInteger(effort) || effort < 0 || effort > 6) {
    throw new Error(`convertToWebp.effort must be an integer between 0 and 6: ${effort}`);
  }

  return { effort };
}
