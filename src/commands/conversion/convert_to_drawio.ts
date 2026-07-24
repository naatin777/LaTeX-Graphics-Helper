import * as vscode from 'vscode';

import { readOutputPathTemplate } from '../../config/output/output_path_settings.js';
import { resolveOutputPath } from '../../config/output/resolve_output_path.js';
import {
  readDrawioExecutablePath,
  readGhostscriptExecutablePath,
  readPdftocairoExecutablePath,
} from '../../config/external_tools/external_tool_paths.js';
import { getMaxInputPixels } from '../../config/raster_input.js';
import { readMermaidPuppeteerOptions } from '../../config/rendering/mermaid_puppeteer_options.js';
import { convertToDrawioFiles, type ConvertToDrawioJob } from '../../operations/conversion/convert_to_drawio.js';
import type { CommandDependencies } from '../shared/command_dependencies.js';
import { createOutputConversionMessages, runOutputConversion } from '../lifecycle/run_output_conversion.js';
import { resolveOutputConflicts } from '../lifecycle/safe_mode.js';
import { assertFileScheme, selectedUris } from '../shared/command_utils.js';

export const CONVERT_TO_DRAWIO_COMMAND = 'latex-graphics-helper.convertToDrawio';

const DEFAULT_OUTPUT_PATH = '${fileDirname}/${fileBasenameNoExtension}.dio';
const DRAWIO_EXTENSIONS = ['.drawio', '.dio', '.drawio.png', '.dio.png', '.drawio.svg', '.dio.svg'] as const;

export async function convertToDrawioCommand(
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
    const first = sourceUris[0];
    if (first === undefined) {
      throw new Error('No files were selected.');
    }
    assertFileScheme(first);
    const workspace = vscode.workspace.getWorkspaceFolder(first);
    if (!workspace) {
      throw new Error(`The file must be inside an open workspace: ${first.fsPath}`);
    }
    const template = readOutputPathTemplate(
      configuration,
      'convertToDrawio',
      'outputPath.convertToDrawio',
      DEFAULT_OUTPUT_PATH,
    );
    const outputPath = resolveOutputPath(
      template,
      {
        sourcePath: first.fsPath,
        workspacePath: workspace.uri.fsPath,
        workspaceName: workspace.name,
      },
      { allowedExtensions: DRAWIO_EXTENSIONS },
    );
    const drawioPath = readDrawioExecutablePath(configuration);
    const jobs: ConvertToDrawioJob[] = [
      {
        inputs: sourceUris.map((sourceUri) => {
          assertFileScheme(sourceUri);
          const inputWorkspace = vscode.workspace.getWorkspaceFolder(sourceUri);
          if (!inputWorkspace || inputWorkspace.uri.fsPath !== workspace.uri.fsPath) {
            throw new Error(`All files must be inside the same workspace: ${sourceUri.fsPath}`);
          }
          return { sourcePath: sourceUri.fsPath };
        }),
        outputPath,
        workspacePath: workspace.uri.fsPath,
      },
    ];
    await runOutputConversion({
      operationName: 'convert-to-drawio',
      ...(dependencies?.outputChannel !== undefined && { outputChannel: dependencies.outputChannel }),
      resolveConflicts: resolveOutputConflicts,
      messages: createOutputConversionMessages('Draw.io', sourceUris.length),
      run: (runtime) =>
        convertToDrawioFiles({
          jobs,
          drawioPath,
          ghostscriptPath: readGhostscriptExecutablePath(configuration),
          pdftocairoPath: readPdftocairoExecutablePath(configuration),
          mermaidTools: readMermaidPuppeteerOptions(configuration, 'convertToPdf'),
          maxInputPixels: getMaxInputPixels(configuration),
          runtime,
        }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(`Failed to create Draw.io file: ${message}`);
  }
}
