import * as vscode from 'vscode';

import { cleanupConversionArtifacts, type ConversionArtifactRoot } from '../operations/cleanup_conversion_artifacts.js';
import type { LineOutputChannel } from '../operations/external_tool_ascii_scratch.js';
import {
  createConversionUndoRecord,
  type ConversionOutput,
  type ConversionUndoRecord,
  undoConversionOutputs,
} from '../operations/undo_last_conversion.js';

import type { CommandDependencies } from './command_dependencies.js';
import { userMessage } from './user_messages.js';

export const UNDO_LAST_CONVERSION_COMMAND = 'latex-graphics-helper.undoLastConversion';

let lastConversion: ConversionUndoRecord | undefined;

export async function rememberLastConversion(
  outputs: ConversionOutput[],
  outputChannel?: LineOutputChannel,
): Promise<string> {
  let record: ConversionUndoRecord;

  try {
    record = await createConversionUndoRecord(outputs);
  } catch (error) {
    await cleanupConversionArtifacts(toArtifactRoots(outputs), outputChannel);
    throw error instanceof Error ? error : new Error(String(error));
  }

  const previousConversion = lastConversion;
  lastConversion = record;
  await cleanupConversionArtifacts(
    [...toArtifactRoots(previousConversion?.outputs), ...toArtifactRoots(record.outputs, true)],
    outputChannel,
  );
  return record.id;
}

export async function undoLastConversion(expectedId?: string, dependencies?: CommandDependencies): Promise<void> {
  const outputChannel = dependencies?.outputChannel;
  try {
    if (!lastConversion) {
      await vscode.window.showInformationMessage(userMessage('message.undo.none'));
      return;
    }

    if (expectedId && expectedId !== lastConversion.id) {
      await vscode.window.showWarningMessage(userMessage('message.undo.newerConversionCompleted'));
      return;
    }

    await undoConversionOutputs(lastConversion, outputChannel);
    lastConversion = undefined;
    await vscode.window.showInformationMessage(userMessage('message.undo.removedLastOutput'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(userMessage('message.undo.failed', message));
  }
}

function toArtifactRoots(
  outputs: readonly ConversionOutput[] | undefined,
  preserveBackups = false,
): ConversionArtifactRoot[] {
  return (
    outputs?.flatMap((output) =>
      output.stagingRootPath
        ? [
            {
              rootPath: output.stagingRootPath,
              workspacePath: output.workspacePath,
              ...(preserveBackups && output.previousFilePath !== undefined
                ? { preservePaths: [output.previousFilePath] }
                : {}),
            },
          ]
        : [],
    ) ?? []
  );
}
