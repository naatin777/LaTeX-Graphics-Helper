import * as vscode from 'vscode';

import { logicalSourcePathForOutputTemplate } from '../../application/policy/source_format.js';
import { readGhostscriptExecutablePath } from '../../config/external_tools/external_tool_paths.js';
import { getMaxInputPixels } from '../../config/raster_input.js';
import { readOutputFormatOutputTemplate } from '../../config/output/output_path_settings.js';
import { resolveOutputPath } from '../../config/output/resolve_output_path.js';
import { combineImagesToPdf } from '../../operations/conversion/combine_images_to_pdf.js';
import { assertWritablePathInWorkspace } from '../../security/workspace_path.js';

import type { CommandDependencies } from '../shared/command_dependencies.js';
import { readSvgToPdfOptions } from './convert_to_pdf.js';
import { createOutputConversionMessages, runOutputConversion } from '../lifecycle/run_output_conversion.js';
import { resolveOutputConflicts } from '../lifecycle/safe_mode.js';
import { userMessage } from '../shared/user_messages.js';
import { selectedUris } from '../shared/command_utils.js';
import { localeMap } from '../../locale_map.js';

export const COMBINE_IMAGES_TO_PDF_COMMAND = 'latex-graphics-helper.convertImagesToSinglePdf';
const DEFAULT_OUTPUT_PATH = '${fileDirname}/${fileBasenameNoExtension}.pdf';
const OUTPUT_PATH_SETTING = 'outputPath.convertImagesToSinglePdf';

export async function combineImagesToPdfCommand(
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

    const previewedUris = sourceUris.length > 1 ? await previewCombineInputs(sourceUris) : sourceUris;
    if (previewedUris === undefined) {
      return;
    }

    const workspaceFolder = requireSingleWorkspace(previewedUris);
    const workspacePath = workspaceFolder.uri.fsPath;
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    const outputTemplate = readOutputFormatOutputTemplate(configuration, OUTPUT_PATH_SETTING);
    const outputPath = await resolveCombineOutputPath(previewedUris, workspaceFolder, outputTemplate);

    if (outputPath === undefined) {
      return;
    }

    await assertWritablePathInWorkspace(outputPath, workspacePath);

    const svgToPdf = readSvgToPdfOptions(configuration);
    const ghostscriptPath = readGhostscriptExecutablePath(configuration);
    const jobs = previewedUris.map((sourceUri) => ({ sourcePath: sourceUri.fsPath }));

    await runOutputConversion({
      operationName: 'combine-images-to-pdf',
      ...(outputChannel !== undefined && { outputChannel }),
      resolveConflicts: resolveOutputConflicts,
      messages: createOutputConversionMessages('PDF', jobs.length),
      run: (runtime) =>
        combineImagesToPdf({
          jobs,
          outputPath,
          workspacePath,
          runtime,
          maxInputPixels: getMaxInputPixels(configuration),
          svgToPdf,
          ghostscriptPath,
          platform: process.platform,
        }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(userMessage('message.convertToOutput.failed', 'PDF', message));
  }
}

interface CombinePreviewItem extends vscode.QuickPickItem {
  sourceUri: vscode.Uri;
  removeButton: vscode.QuickInputButton;
  moveUpButton: vscode.QuickInputButton;
  moveDownButton: vscode.QuickInputButton;
}

export function previewCombineInputs(sourceUris: vscode.Uri[]): Promise<vscode.Uri[] | undefined> {
  const quickPick = vscode.window.createQuickPick<CombinePreviewItem>();
  const removeButton = { iconPath: new vscode.ThemeIcon('close'), tooltip: localeMap('quickPick.combine.remove') };
  const moveUpButton = { iconPath: new vscode.ThemeIcon('arrow-up'), tooltip: localeMap('quickPick.combine.moveUp') };
  const moveDownButton = {
    iconPath: new vscode.ThemeIcon('arrow-down'),
    tooltip: localeMap('quickPick.combine.moveDown'),
  };
  let items = sourceUris.map((sourceUri) => ({
    label: pathLabel(sourceUri),
    sourceUri,
    removeButton,
    moveUpButton,
    moveDownButton,
  }));

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: vscode.Uri[] | undefined) => {
      if (settled) {
        return;
      }
      settled = true;
      quickPick.hide();
      quickPick.dispose();
      resolve(result);
    };

    const refresh = () => {
      quickPick.items = items.map((item, index) => ({
        ...item,
        label: `${index + 1}. ${pathLabel(item.sourceUri)}`,
        buttons: [item.moveUpButton, item.moveDownButton, item.removeButton],
      }));
    };

    quickPick.title = localeMap('quickPick.combine.title');
    quickPick.placeholder = localeMap('quickPick.combine.placeholder');
    quickPick.ignoreFocusOut = true;
    quickPick.onDidTriggerItemButton(({ item, button }) => {
      const index = items.findIndex((candidate) => candidate.sourceUri.toString() === item.sourceUri.toString());
      if (index < 0) {
        return;
      }
      if (button === item.removeButton) {
        items.splice(index, 1);
      } else if (button === item.moveUpButton && index > 0) {
        [items[index - 1], items[index]] = [items[index]!, items[index - 1]!];
      } else if (button === item.moveDownButton && index < items.length - 1) {
        [items[index], items[index + 1]] = [items[index + 1]!, items[index]!];
      }
      refresh();
    });
    quickPick.onDidAccept(() => finish(items.length > 0 ? items.map((item) => item.sourceUri) : undefined));
    quickPick.onDidHide(() => finish(undefined));
    refresh();
    quickPick.show();
  });
}

function pathLabel(uri: vscode.Uri): string {
  return uri.fsPath.split(/[\\/]/u).at(-1) ?? uri.fsPath;
}

async function resolveCombineOutputPath(
  sourceUris: vscode.Uri[],
  workspaceFolder: vscode.WorkspaceFolder,
  configuredTemplate: string | undefined,
): Promise<string | undefined> {
  const sourceUri = sourceUris[0]!;

  if (configuredTemplate !== undefined || sourceUris.length === 1) {
    const template = configuredTemplate ?? DEFAULT_OUTPUT_PATH;
    return resolveOutputPath(template, {
      sourcePath: logicalSourcePathForOutputTemplate(sourceUri.fsPath),
      workspacePath: workspaceFolder.uri.fsPath,
      workspaceName: workspaceFolder.name,
    });
  }

  const saveUri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.joinPath(workspaceFolder.uri, 'combined.pdf'),
    filters: { 'PDF files': ['pdf'] },
  });

  if (!saveUri) {
    return undefined;
  }

  assertOutputInsideWorkspace(saveUri, workspaceFolder);
  return saveUri.fsPath;
}

function requireSingleWorkspace(sourceUris: vscode.Uri[]): vscode.WorkspaceFolder {
  for (const sourceUri of sourceUris) {
    if (sourceUri.scheme !== 'file') {
      throw new Error(`Only local files are supported: ${sourceUri.toString()}`);
    }
  }

  const firstSource = sourceUris[0]!;
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(firstSource);

  if (!workspaceFolder) {
    throw new Error(`The file must be inside an open workspace: ${firstSource.fsPath}`);
  }

  for (const sourceUri of sourceUris.slice(1)) {
    const sourceWorkspace = vscode.workspace.getWorkspaceFolder(sourceUri);
    if (!sourceWorkspace || sourceWorkspace.uri.toString() !== workspaceFolder.uri.toString()) {
      throw new Error(`All selected files must be inside the same open workspace: ${sourceUri.fsPath}`);
    }
  }

  return workspaceFolder;
}

function assertOutputInsideWorkspace(outputUri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder): void {
  if (outputUri.scheme !== 'file') {
    throw new Error(`Only local output files are supported: ${outputUri.toString()}`);
  }

  const outputWorkspace = vscode.workspace.getWorkspaceFolder(outputUri);
  if (!outputWorkspace || outputWorkspace.uri.toString() !== workspaceFolder.uri.toString()) {
    throw new Error(`The output file must be inside the selected workspace: ${outputUri.fsPath}`);
  }
}
