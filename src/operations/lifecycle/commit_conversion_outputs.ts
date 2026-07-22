import { constants as fsConstants } from 'node:fs';
import { access, copyFile, mkdir, open, rm, stat } from 'node:fs/promises';
import path from 'node:path';

import { assertExistingPathInWorkspace, assertWritablePathInWorkspace } from '../../security/workspace_path.js';

import {
  cleanupConversionArtifacts,
  type CleanupPreservingError,
  type ConversionArtifactRoot,
} from './cleanup_conversion_artifacts.js';
import type { LineOutputChannel } from '../external_tools/external_tool_ascii_scratch.js';
import { filesHaveEqualContents, hashFile } from '../input/file_content_hash.js';

export type OutputConflictDecision = 'keep-both' | 'cancel' | 'overwrite';

export interface PreparedConversionOutput {
  stagedOutputPath: string;
  outputPath: string;
  workspacePath: string;
  stagingRootPath?: string;
}

export interface CommittedConversionOutput {
  outputPath: string;
  workspacePath: string;
  previousFilePath?: string;
  stagingRootPath?: string;
}

export interface CommitConversionOutputsOptions {
  resolveConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  signal?: AbortSignal;
  operationName?: string;
  outputChannel?: LineOutputChannel;
  copyFile?: (source: string, destination: string, flags?: number) => Promise<void>;
  rm?: typeof rm;
}

interface ResolvedOutput extends PreparedConversionOutput {
  previousFilePath?: string;
  existedBeforeCommit: boolean;
  contentHashBeforeConflict?: string;
  createdOutputIdentity?: FileIdentity;
}

interface ExistingOutputSnapshot {
  output: PreparedConversionOutput;
  contentHash: string;
}

interface FileIdentity {
  dev: number;
  ino: number;
}

export interface RollbackFailure {
  outputPath: string;
  error: Error;
}

export class CommitRollbackError extends Error implements CleanupPreservingError {
  readonly originalError: Error;
  readonly rollbackErrors: readonly RollbackFailure[];
  readonly cleanupPreservePaths: readonly string[];

  constructor(
    originalError: unknown,
    rollbackErrors: readonly RollbackFailure[],
    cleanupPreservePaths: readonly string[] = [],
  ) {
    const normalizedOriginalError = asError(originalError);
    const details = rollbackErrors.map(({ outputPath, error }) => `${outputPath}: ${error.message}`).join('; ');
    super(`Commit failed: ${normalizedOriginalError.message}; rollback failed: ${details}`);
    this.name = 'CommitRollbackError';
    this.originalError = normalizedOriginalError;
    this.rollbackErrors = rollbackErrors;
    this.cleanupPreservePaths = [...new Set(cleanupPreservePaths)];
  }
}

export class OperationCancelledError extends Error {
  constructor(message = 'Operation was cancelled.') {
    super(message);
    this.name = 'AbortError';
  }
}

export async function commitConversionOutputs(
  outputs: PreparedConversionOutput[],
  options: CommitConversionOutputsOptions = {},
): Promise<CommittedConversionOutput[]> {
  let resolvedOutputs: ResolvedOutput[] = [];

  try {
    options.signal?.throwIfAborted();
    assertUniqueRequestedOutputs(outputs);
    await validatePreparedOutputs(outputs);

    const conflicts = await findExistingOutputs(outputs);
    const decision = await resolveDecision(
      conflicts.map(({ output }) => output),
      options.resolveConflicts,
    );
    options.outputChannel?.appendLine(`[${options.operationName ?? 'conversion'}] conflict decision: ${decision}`);
    resolvedOutputs = await resolveOutputPaths(outputs, decision, conflicts);

    options.signal?.throwIfAborted();
    await assertConflictOutputsUnchanged(resolvedOutputs);
    await createBackups(resolvedOutputs, decision, options.copyFile ?? copyFile);
    options.signal?.throwIfAborted();

    return await commitResolvedOutputs(resolvedOutputs, options);
  } catch (error) {
    await cleanupConversionArtifacts(
      toArtifactRoots(resolvedOutputs.length > 0 ? resolvedOutputs : outputs),
      options.outputChannel,
      error,
    );
    throw error instanceof Error ? error : new Error(String(error));
  }
}

async function resolveDecision(
  conflicts: PreparedConversionOutput[],
  resolveConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>,
): Promise<OutputConflictDecision> {
  if (conflicts.length === 0) {
    return 'overwrite';
  }

  if (!resolveConflicts) {
    throw new Error(`Output file already exists: ${conflicts[0]?.outputPath}`);
  }

  const decision = await resolveConflicts(conflicts.map((item) => item.outputPath));

  if (decision === 'cancel') {
    throw new OperationCancelledError('Output conflict resolution was cancelled.');
  }

  return decision;
}

async function resolveOutputPaths(
  outputs: PreparedConversionOutput[],
  decision: OutputConflictDecision,
  conflicts: ExistingOutputSnapshot[],
): Promise<ResolvedOutput[]> {
  const reservedPaths = new Set(outputs.map((item) => path.resolve(item.outputPath)));
  const snapshots = new Map(conflicts.map((conflict) => [path.resolve(conflict.output.outputPath), conflict]));
  const resolved: ResolvedOutput[] = [];

  for (const output of outputs) {
    const exists = await pathExists(output.outputPath);
    let outputPath = output.outputPath;

    if (exists && decision === 'keep-both') {
      outputPath = await findAvailableOutputPath(output.outputPath, reservedPaths);
      reservedPaths.add(path.resolve(outputPath));
    }

    const snapshot = snapshots.get(path.resolve(output.outputPath));
    const existedBeforeCommit = decision === 'overwrite' && snapshot !== undefined;

    resolved.push({
      ...output,
      outputPath,
      existedBeforeCommit,
      ...(existedBeforeCommit && snapshot !== undefined ? { contentHashBeforeConflict: snapshot.contentHash } : {}),
    });
  }

  return resolved;
}

async function createBackups(
  outputs: ResolvedOutput[],
  decision: OutputConflictDecision,
  copyFileImpl: (source: string, destination: string, flags?: number) => Promise<void>,
): Promise<void> {
  if (decision !== 'overwrite') {
    return;
  }

  for (const output of outputs) {
    if (!output.existedBeforeCommit) {
      continue;
    }

    await assertExistingPathInWorkspace(output.outputPath, output.workspacePath);
    const previousFilePath = `${output.stagedOutputPath}.previous`;
    await assertWritablePathInWorkspace(previousFilePath, output.workspacePath);
    await mkdir(path.dirname(previousFilePath), { recursive: true });
    await copyFileImpl(output.outputPath, previousFilePath, fsConstants.COPYFILE_EXCL);
    output.previousFilePath = previousFilePath;
  }
}

async function commitResolvedOutputs(
  outputs: ResolvedOutput[],
  options: CommitConversionOutputsOptions,
): Promise<CommittedConversionOutput[]> {
  const committed: ResolvedOutput[] = [];
  const rollbackCandidates: ResolvedOutput[] = [];
  const copyFileImpl = options.copyFile ?? copyFile;

  try {
    for (const output of outputs) {
      options.signal?.throwIfAborted();
      await assertExistingPathInWorkspace(output.stagedOutputPath, output.workspacePath);
      await assertWritablePathInWorkspace(output.outputPath, output.workspacePath);
      await mkdir(path.dirname(output.outputPath), { recursive: true });
      options.signal?.throwIfAborted();

      if (output.previousFilePath) {
        await assertExistingPathInWorkspace(output.previousFilePath, output.workspacePath);

        if (!(await filesHaveEqualContents(output.outputPath, output.previousFilePath))) {
          throw new Error(`Output changed before overwrite: ${output.outputPath}`);
        }
      } else {
        output.createdOutputIdentity = await createOwnedOutputPlaceholder(output.outputPath);
      }

      rollbackCandidates.push(output);
      await copyFileImpl(output.stagedOutputPath, output.outputPath);
      committed.push(output);
      options.signal?.throwIfAborted();
    }
  } catch (error) {
    const rollbackErrors = await rollbackCommittedOutputs(rollbackCandidates, options);

    if (rollbackErrors.length > 0) {
      for (const failure of rollbackErrors) {
        options.outputChannel?.appendLine(
          `[${options.operationName ?? 'conversion'}] rollback failed for ${failure.outputPath}: ${failure.error.message}`,
        );
        const output = outputs.find((item) => item.outputPath === failure.outputPath);
        if (output?.previousFilePath !== undefined) {
          options.outputChannel?.appendLine(
            `[${options.operationName ?? 'conversion'}] preserving recovery backup for ${failure.outputPath}: ${output.previousFilePath}`,
          );
        }
      }
      const recoveryBackupPaths = rollbackErrors.flatMap((failure) => {
        const output = outputs.find((item) => item.outputPath === failure.outputPath);
        return output?.previousFilePath ? [output.previousFilePath] : [];
      });
      throw new CommitRollbackError(error, rollbackErrors, recoveryBackupPaths);
    }

    throw error instanceof Error ? error : new Error(String(error));
  }

  return committed.map(({ outputPath, workspacePath, previousFilePath, stagingRootPath }) => {
    const result: CommittedConversionOutput = { outputPath, workspacePath };

    if (previousFilePath !== undefined) {
      result.previousFilePath = previousFilePath;
    }

    if (stagingRootPath !== undefined) {
      result.stagingRootPath = stagingRootPath;
    }

    options.outputChannel?.appendLine(`[${options.operationName ?? 'conversion'}] committed output: ${outputPath}`);

    return result;
  });
}

function toArtifactRoots(outputs: PreparedConversionOutput[]): ConversionArtifactRoot[] {
  return outputs.flatMap((output) =>
    output.stagingRootPath
      ? [
          {
            rootPath: output.stagingRootPath,
            workspacePath: output.workspacePath,
          },
        ]
      : [],
  );
}

async function rollbackCommittedOutputs(
  outputs: ResolvedOutput[],
  options: CommitConversionOutputsOptions,
): Promise<RollbackFailure[]> {
  const copyFileImpl = options.copyFile ?? copyFile;
  const rmImpl = options.rm ?? rm;
  const failures: RollbackFailure[] = [];

  for (let index = outputs.length - 1; index >= 0; index -= 1) {
    const output = outputs[index];

    if (!output) {
      continue;
    }

    try {
      await assertExistingPathInWorkspace(output.outputPath, output.workspacePath);

      if (output.previousFilePath) {
        await assertExistingPathInWorkspace(output.previousFilePath, output.workspacePath);
        await copyFileImpl(output.previousFilePath, output.outputPath);
      } else if (output.createdOutputIdentity !== undefined) {
        const currentIdentity = await readFileIdentity(output.outputPath);

        if (!sameFileIdentity(currentIdentity, output.createdOutputIdentity)) {
          throw new Error('Output was replaced by another process; it was not removed.');
        }

        await rmImpl(output.outputPath, { force: true });
      }
    } catch (error) {
      failures.push({ outputPath: output.outputPath, error: asError(error) });
    }
  }

  return failures;
}

async function validatePreparedOutputs(outputs: PreparedConversionOutput[]): Promise<void> {
  await Promise.all(
    outputs.flatMap((output) => [
      assertExistingPathInWorkspace(output.stagedOutputPath, output.workspacePath),
      assertWritablePathInWorkspace(output.outputPath, output.workspacePath),
    ]),
  );
}

async function findExistingOutputs(outputs: PreparedConversionOutput[]): Promise<ExistingOutputSnapshot[]> {
  const existence = await Promise.all(outputs.map((output) => pathExists(output.outputPath)));
  return Promise.all(
    outputs.flatMap((output, index) => (existence[index] ? [createExistingOutputSnapshot(output)] : [])),
  );
}

async function createExistingOutputSnapshot(output: PreparedConversionOutput): Promise<ExistingOutputSnapshot> {
  return { output, contentHash: await hashFile(output.outputPath) };
}

async function findAvailableOutputPath(requestedPath: string, reservedPaths: Set<string>): Promise<string> {
  const extension = path.extname(requestedPath);
  const basename = path.basename(requestedPath, extension);
  const directory = path.dirname(requestedPath);

  for (let suffix = 1; ; suffix++) {
    const candidate = path.join(directory, `${basename}-${suffix}${extension}`);
    const normalizedCandidate = path.resolve(candidate);

    if (!reservedPaths.has(normalizedCandidate) && !(await pathExists(candidate))) {
      return candidate;
    }
  }
}

function assertUniqueRequestedOutputs(outputs: PreparedConversionOutput[]): void {
  const normalizedPaths = new Set<string>();

  for (const output of outputs) {
    const normalizedPath = path.resolve(output.outputPath);

    if (normalizedPaths.has(normalizedPath)) {
      throw new Error(`Multiple conversions resolve to the same output: ${output.outputPath}`);
    }

    normalizedPaths.add(normalizedPath);
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return false;
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}

async function assertConflictOutputsUnchanged(outputs: ResolvedOutput[]): Promise<void> {
  await Promise.all(
    outputs.map(async (output) => {
      if (output.contentHashBeforeConflict === undefined) {
        return;
      }

      await assertExistingPathInWorkspace(output.outputPath, output.workspacePath);

      if ((await hashFile(output.outputPath)) !== output.contentHashBeforeConflict) {
        throw new Error(`Output changed before overwrite: ${output.outputPath}`);
      }
    }),
  );
}

async function createOwnedOutputPlaceholder(outputPath: string): Promise<FileIdentity> {
  const handle = await open(outputPath, 'wx');

  try {
    const outputStat = await handle.stat();
    return { dev: outputStat.dev, ino: outputStat.ino };
  } finally {
    await handle.close();
  }
}

async function readFileIdentity(filePath: string): Promise<FileIdentity> {
  const fileStat = await stat(filePath);
  return { dev: fileStat.dev, ino: fileStat.ino };
}

function sameFileIdentity(first: FileIdentity, second: FileIdentity): boolean {
  return first.dev === second.dev && first.ino === second.ino;
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
