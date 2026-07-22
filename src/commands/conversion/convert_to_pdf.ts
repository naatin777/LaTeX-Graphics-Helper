import path from 'node:path';

import * as vscode from 'vscode';

import {
  isEditableDrawioImagePath,
  logicalSourcePathForOutputTemplate,
} from '../../application/policy/source_format.js';
import { readDrawioExecutablePath } from '../../config/external_tools/external_tool_paths.js';
import {
  readGhostscriptExecutablePath,
  readRsvgConvertExecutablePath,
} from '../../config/external_tools/external_tool_paths.js';
import {
  readMermaidPuppeteerOptions,
  readPuppeteerExecutablePath,
} from '../../config/rendering/mermaid_puppeteer_options.js';
import { readOutputFormatOutputTemplate } from '../../config/output/output_path_settings.js';
import { resolveOutputPath } from '../../config/output/resolve_output_path.js';
import {
  convertToPdfFiles,
  validateSvgToPdfOptions,
  type ConvertToPdfFilesOptions,
  type ConvertToPdfJob,
  type DrawioToPdfOptions,
  type SvgToPdfEngine,
  type SvgToPdfOptions,
} from '../../operations/conversion/convert_to_pdf.js';
import type { LineOutputChannel } from '../../operations/external_tools/external_tool_ascii_scratch.js';

import type { CommandDependencies } from '../shared/command_dependencies.js';
import { runOutputConversion } from '../lifecycle/run_output_conversion.js';
import { resolveOutputConflicts } from '../lifecycle/safe_mode.js';
import { userMessage } from '../shared/user_messages.js';
import { isAbortError, selectedUris } from '../shared/command_utils.js';

export const CONVERT_PNG_TO_PDF_COMMAND = 'latex-graphics-helper.convertPngToPdf';
export const CONVERT_TO_PDF_COMMAND = 'latex-graphics-helper.convertToPdf';

const DEFAULT_OUTPUT_PATH = '${fileDirname}/${fileBasenameNoExtension}.pdf';
const DEFAULT_DRAWIO_OUTPUT_PATH = '${fileDirname}/${fileBasenameNoExtension}.pdf';
const PNG_EXTENSIONS = ['.png'] as const;
const PDF_IMAGE_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.avif',
  '.gif',
  '.tif',
  '.tiff',
  '.svg',
  '.mmd',
  '.mermaid',
  '.eps',
  '.drawio.png',
  '.dio.png',
  '.drawio.svg',
  '.dio.svg',
] as const;

export async function convertPngToPdfInternalCommand(
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
  dependencies?: CommandDependencies,
): Promise<void> {
  const outputChannel = dependencies?.outputChannel;
  await convertSelectedSourcesToPdf(uri, uris, {
    supportedExtensions: PNG_EXTENSIONS,
    titleKey: 'message.progress.convertPngToPdf.title',
    successKey: 'message.convertPngToPdf.success',
    failedKey: 'message.convertPngToPdf.failed',
    cancelledKey: 'message.convertPngToPdf.cancelled',
    operationName: 'convert-png-to-pdf',
    ...(outputChannel !== undefined && { outputChannel }),
  });
}

export async function convertToPdfCommand(
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
  dependencies?: CommandDependencies,
): Promise<void> {
  const outputChannel = dependencies?.outputChannel;
  await convertSelectedSourcesToPdf(uri, uris, {
    supportedExtensions: PDF_IMAGE_EXTENSIONS,
    titleKey: 'message.progress.convertToPdf.title',
    successKey: 'message.convertToPdf.success',
    failedKey: 'message.convertToPdf.failed',
    cancelledKey: 'message.convertToPdf.cancelled',
    outputFormatOutputPathKey: 'outputPath.convertToPdf',
    operationName: 'convert-to-pdf',
    ...(outputChannel !== undefined && { outputChannel }),
  });
}

async function convertSelectedSourcesToPdf(
  uri: vscode.Uri | undefined,
  uris: vscode.Uri[] | undefined,
  messages: {
    supportedExtensions: readonly string[];
    titleKey: 'message.progress.convertPngToPdf.title' | 'message.progress.convertToPdf.title';
    successKey: 'message.convertPngToPdf.success' | 'message.convertToPdf.success';
    failedKey: 'message.convertPngToPdf.failed' | 'message.convertToPdf.failed';
    cancelledKey: 'message.convertPngToPdf.cancelled' | 'message.convertToPdf.cancelled';
    outputFormatOutputPathKey?: 'outputPath.convertToPdf';
    operationName: string;
    outputChannel?: LineOutputChannel;
  },
): Promise<void> {
  try {
    const sourceUris = selectedUris(uri, uris);

    if (sourceUris.length === 0) {
      throw new Error('No files were selected.');
    }

    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    const outputTemplate = configuration.get<string>('outputPath.convertPngToPdf', DEFAULT_OUTPUT_PATH);
    const outputFormatOutputTemplate =
      messages.outputFormatOutputPathKey === undefined
        ? undefined
        : readOutputFormatOutputTemplate(configuration, messages.outputFormatOutputPathKey);
    const svgToPdf = readSvgToPdfOptions(configuration);
    validateSvgToPdfOptions(svgToPdf);
    const mermaid = readMermaidPuppeteerOptions(configuration, 'convertToPdf');
    const drawio = readDrawioToPdfOptions(configuration);
    const ghostscriptPath = readGhostscriptExecutablePath(configuration);
    const jobs = sourceUris.map((sourceUri) =>
      createJob(
        sourceUri,
        outputTemplateForSource(sourceUri, configuration, outputTemplate, outputFormatOutputTemplate),
        logicalSourcePathForOutputTemplate(sourceUri.fsPath),
        messages.supportedExtensions,
      ),
    );
    await runOutputConversion({
      operationName: messages.operationName,
      ...(messages.outputChannel !== undefined && { outputChannel: messages.outputChannel }),
      resolveConflicts: resolveOutputConflicts,
      messages: {
        progressTitle: userMessage(messages.titleKey, jobs.length),
        prepareMessage: userMessage('message.progress.prepareConversion', 'PDF'),
        successMessage: (count) => userMessage(messages.successKey, count),
        undoUnavailableMessage: (success, reason) => userMessage('message.undoUnavailable', success, reason),
        cancelledMessage: userMessage(messages.cancelledKey),
        failedMessage: (reason) => userMessage(messages.failedKey, reason),
      },
      run: (runtime) => {
        const convertOptions: ConvertToPdfFilesOptions = {
          jobs,
          supportedExtensions: messages.supportedExtensions,
          svgToPdf,
          mermaid,
          drawio,
          ghostscriptPath,
          operationName: messages.operationName,
        };
        if (runtime.signal !== undefined) {
          convertOptions.signal = runtime.signal;
        }
        if (runtime.resolveConflicts !== undefined) {
          convertOptions.resolveOutputConflicts = runtime.resolveConflicts;
        }
        if (runtime.outputChannel !== undefined) {
          convertOptions.outputChannel = runtime.outputChannel;
        }
        return convertToPdfFiles(convertOptions);
      },
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

export function outputTemplateForSource(
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
    const configuredPath = configuration.get<string>(
      'outputPath.convertDrawioToPdfDirectly',
      DEFAULT_DRAWIO_OUTPUT_PATH,
    );
    return configuredPath.trim() ? configuredPath : DEFAULT_DRAWIO_OUTPUT_PATH;
  }

  switch (extension) {
    case '.png': {
      return pngOutputTemplate;
    }
    case '.jpg':
    case '.jpeg': {
      return configuration.get<string>('outputPath.convertJpegToPdf', DEFAULT_OUTPUT_PATH);
    }
    case '.webp': {
      return configuration.get<string>('outputPath.convertWebpToPdf', DEFAULT_OUTPUT_PATH);
    }
    case '.avif': {
      return configuration.get<string>('outputPath.convertAvifToPdf', DEFAULT_OUTPUT_PATH);
    }
    case '.svg': {
      return configuration.get<string>('outputPath.convertSvgToPdf', DEFAULT_OUTPUT_PATH);
    }
    case '.mmd':
    case '.mermaid': {
      return configuration.get<string>('outputPath.convertMermaidToPdf', DEFAULT_OUTPUT_PATH);
    }
    default: {
      return DEFAULT_OUTPUT_PATH;
    }
  }
}

export function readSvgToPdfOptions(configuration: vscode.WorkspaceConfiguration): SvgToPdfOptions {
  const executablePath = readPuppeteerExecutablePath(configuration, 'convertToPdf.svg.puppeteer.executablePath');

  return {
    engine: configuration.get<SvgToPdfEngine>('convertToPdf.svg.engine', 'puppeteer'),
    rsvgConvertPath: readRsvgConvertExecutablePath(configuration),
    puppeteerBrowser: configuration.get<'chrome' | 'firefox'>('puppeteer.browser', 'chrome'),
    puppeteerBrowserChannel: configuration.get('convertToPdf.svg.puppeteer.browserChannel', 'chrome'),
    ...(executablePath ? { puppeteerExecutablePath: executablePath } : {}),
  };
}

function readDrawioToPdfOptions(configuration: vscode.WorkspaceConfiguration): DrawioToPdfOptions {
  return {
    drawioPath: readDrawioExecutablePath(configuration),
  };
}

function createJob(
  sourceUri: vscode.Uri,
  outputTemplate: string,
  templateSourcePath: string,
  supportedExtensions: readonly string[],
): ConvertToPdfJob {
  if (sourceUri.scheme !== 'file') {
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
