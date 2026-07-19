import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

import { assertExistingPathInWorkspace, assertWritablePathInWorkspace } from '../security/workspace_path.js';

import { cleanupConversionArtifacts, type ConversionArtifactRoot } from './cleanup_conversion_artifacts.js';
import type { LineOutputChannel } from './external_tool_ascii_scratch.js';
import { hashFile } from './file_content_hash.js';

export interface ConversionOutput {
  outputPath: string;
  workspacePath: string;
  previousFilePath?: string;
  stagingRootPath?: string;
}

export interface ConversionUndoRecord {
  id: string;
  outputs: ConversionUndoOutput[];
}

interface ConversionUndoOutput extends ConversionOutput {
  sha256: string;
  previousSha256?: string;
}

export async function createConversionUndoRecord(outputs: ConversionOutput[]): Promise<ConversionUndoRecord> {
  if (outputs.length === 0) {
    throw new Error('No conversion outputs were provided.');
  }

  const uniquePaths = new Set<string>();
  const recordedOutputs = await Promise.all(
    outputs.map(async (output) => {
      const normalizedPath = path.resolve(output.outputPath);

      if (uniquePaths.has(normalizedPath)) {
        throw new Error(`Duplicate conversion output: ${output.outputPath}`);
      }
      uniquePaths.add(normalizedPath);

      await assertExistingPathInWorkspace(output.outputPath, output.workspacePath);
      const previousSha256 = output.previousFilePath
        ? await recordPreviousFile(output.previousFilePath, output.workspacePath)
        : undefined;

      return {
        ...output,
        sha256: await calculateSha256(output.outputPath),
        ...(previousSha256 !== undefined && { previousSha256 }),
      };
    }),
  );

  return {
    id: crypto.randomUUID(),
    outputs: recordedOutputs,
  };
}

export async function undoConversionOutputs(
  record: ConversionUndoRecord,
  outputChannel?: LineOutputChannel,
): Promise<void> {
  await Promise.all(record.outputs.map(validateUnchangedOutput));
  const rollbackCopies = await createRollbackCopies(record);

  try {
    for (const output of record.outputs) {
      // 検証後の差し替え時間を短くするため、削除直前にも同じ条件を確認する。
      await validateUnchangedOutput(output);

      if (output.previousFilePath) {
        await assertExistingPathInWorkspace(output.previousFilePath, output.workspacePath);
        await copyFile(output.previousFilePath, output.outputPath);
      } else {
        await rm(output.outputPath);
      }
    }
  } catch (error) {
    try {
      await Promise.all(
        rollbackCopies.map(async ({ output, rollbackPath }) => {
          await assertWritablePathInWorkspace(output.outputPath, output.workspacePath);
          await copyFile(rollbackPath, output.outputPath);
        }),
      );
    } catch (rollbackError) {
      throw new Error(`Undo failed and rollback was incomplete: ${String(error)}`, { cause: rollbackError });
    }
    throw error;
  } finally {
    await Promise.all(
      rollbackCopies.map(({ rollbackRootPath }) => rm(rollbackRootPath, { recursive: true, force: true })),
    );
  }

  await cleanupConversionArtifacts(toArtifactRoots(record), outputChannel);
}

async function createRollbackCopies(
  record: ConversionUndoRecord,
): Promise<Array<{ output: ConversionUndoOutput; rollbackPath: string; rollbackRootPath: string }>> {
  const rollbackCopies: Array<{ output: ConversionUndoOutput; rollbackPath: string; rollbackRootPath: string }> = [];

  try {
    const rollbackId = crypto.randomUUID();
    for (const [index, output] of record.outputs.entries()) {
      const rollbackRootPath = path.join(output.workspacePath, '.latex-graphics-helper', 'undo-rollback', rollbackId);
      const rollbackPath = path.join(rollbackRootPath, `${index}.backup`);
      await assertExistingPathInWorkspace(output.outputPath, output.workspacePath);
      await assertWritablePathInWorkspace(rollbackRootPath, output.workspacePath);
      await mkdir(rollbackRootPath, { recursive: true });
      await copyFile(output.outputPath, rollbackPath);
      rollbackCopies.push({ output, rollbackPath, rollbackRootPath });
    }
    return rollbackCopies;
  } catch (error) {
    await Promise.all(
      rollbackCopies.map(({ rollbackRootPath }) => rm(rollbackRootPath, { recursive: true, force: true })),
    );
    throw error;
  }
}

async function validateUnchangedOutput(output: ConversionUndoOutput): Promise<void> {
  await assertExistingPathInWorkspace(output.outputPath, output.workspacePath);

  if ((await calculateSha256(output.outputPath)) !== output.sha256) {
    throw new Error(`Output changed after conversion: ${output.outputPath}`);
  }

  if (output.previousFilePath) {
    await assertExistingPathInWorkspace(output.previousFilePath, output.workspacePath);

    if ((await calculateSha256(output.previousFilePath)) !== output.previousSha256) {
      throw new Error(`Output backup changed after conversion: ${output.previousFilePath}`);
    }
  }
}

async function recordPreviousFile(previousFilePath: string, workspacePath: string): Promise<string> {
  await assertExistingPathInWorkspace(previousFilePath, workspacePath);
  return calculateSha256(previousFilePath);
}

async function calculateSha256(filePath: string): Promise<string> {
  return hashFile(filePath);
}

function toArtifactRoots(record: ConversionUndoRecord): ConversionArtifactRoot[] {
  return record.outputs.flatMap((output) =>
    output.stagingRootPath ? [{ rootPath: output.stagingRootPath, workspacePath: output.workspacePath }] : [],
  );
}
