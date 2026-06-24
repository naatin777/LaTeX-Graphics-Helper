import { constants } from "node:fs";
import { access, copyFile, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

import {
  assertExistingPathInWorkspace,
  assertWritablePathInWorkspace,
} from "../security/workspace_path.js";

export type OutputConflictDecision = "keep-both" | "cancel" | "overwrite";

export interface PreparedConversionOutput {
  stagedOutputPath: string;
  outputPath: string;
  workspacePath: string;
}

export interface CommittedConversionOutput {
  outputPath: string;
  workspacePath: string;
  previousFilePath?: string;
}

export interface CommitConversionOutputsOptions {
  resolveConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  signal?: AbortSignal;
}

interface ResolvedOutput extends PreparedConversionOutput {
  previousFilePath?: string;
  existedBeforeCommit: boolean;
}

export async function commitConversionOutputs(
  outputs: PreparedConversionOutput[],
  options: CommitConversionOutputsOptions = {},
): Promise<CommittedConversionOutput[]> {
  options.signal?.throwIfAborted();
  assertUniqueRequestedOutputs(outputs);
  await validatePreparedOutputs(outputs);

  const conflicts = await findExistingOutputs(outputs);
  const decision = await resolveDecision(conflicts, options.resolveConflicts);
  const resolvedOutputs = await resolveOutputPaths(outputs, decision);

  options.signal?.throwIfAborted();
  await createBackups(resolvedOutputs, decision);
  options.signal?.throwIfAborted();

  return commitResolvedOutputs(resolvedOutputs, options.signal);
}

async function resolveDecision(
  conflicts: PreparedConversionOutput[],
  resolveConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>,
): Promise<OutputConflictDecision> {
  if (conflicts.length === 0) {
    return "overwrite";
  }

  if (!resolveConflicts) {
    throw new Error(`Output file already exists: ${conflicts[0]?.outputPath}`);
  }

  const decision = await resolveConflicts(conflicts.map((item) => item.outputPath));

  if (decision === "cancel") {
    throw new Error("Output conflict resolution was cancelled.");
  }

  return decision;
}

async function resolveOutputPaths(
  outputs: PreparedConversionOutput[],
  decision: OutputConflictDecision,
): Promise<ResolvedOutput[]> {
  const reservedPaths = new Set(outputs.map((item) => path.resolve(item.outputPath)));
  const resolved: ResolvedOutput[] = [];

  for (const output of outputs) {
    const exists = await pathExists(output.outputPath);
    let outputPath = output.outputPath;

    if (exists && decision === "keep-both") {
      outputPath = await findAvailableOutputPath(output.outputPath, reservedPaths);
      reservedPaths.add(path.resolve(outputPath));
    }

    resolved.push({
      ...output,
      outputPath,
      existedBeforeCommit: exists && decision === "overwrite",
    });
  }

  return resolved;
}

async function createBackups(
  outputs: ResolvedOutput[],
  decision: OutputConflictDecision,
): Promise<void> {
  if (decision !== "overwrite") {
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
    await copyFile(output.outputPath, previousFilePath, constants.COPYFILE_EXCL);
    output.previousFilePath = previousFilePath;
  }
}

async function commitResolvedOutputs(
  outputs: ResolvedOutput[],
  signal?: AbortSignal,
): Promise<CommittedConversionOutput[]> {
  const committed: ResolvedOutput[] = [];

  try {
    for (const output of outputs) {
      signal?.throwIfAborted();
      await assertExistingPathInWorkspace(output.stagedOutputPath, output.workspacePath);
      await assertWritablePathInWorkspace(output.outputPath, output.workspacePath);
      await mkdir(path.dirname(output.outputPath), { recursive: true });
      signal?.throwIfAborted();

      if (output.previousFilePath) {
        await assertExistingPathInWorkspace(output.previousFilePath, output.workspacePath);

        if (!(await filesHaveEqualContents(output.outputPath, output.previousFilePath))) {
          throw new Error(`Output changed before overwrite: ${output.outputPath}`);
        }

        await copyFile(output.stagedOutputPath, output.outputPath);
      } else {
        await copyFile(output.stagedOutputPath, output.outputPath, constants.COPYFILE_EXCL);
      }

      committed.push(output);
      signal?.throwIfAborted();
    }
  } catch (error) {
    await rollbackCommittedOutputs(committed);
    throw error;
  }

  return committed.map(({ outputPath, workspacePath, previousFilePath }) => {
    const result: CommittedConversionOutput = { outputPath, workspacePath };

    if (previousFilePath !== undefined) {
      result.previousFilePath = previousFilePath;
    }

    return result;
  });
}

async function rollbackCommittedOutputs(outputs: ResolvedOutput[]): Promise<void> {
  await Promise.allSettled(
    outputs.map(async (output) => {
      await assertExistingPathInWorkspace(output.outputPath, output.workspacePath);

      if (output.previousFilePath) {
        await assertExistingPathInWorkspace(output.previousFilePath, output.workspacePath);
        await copyFile(output.previousFilePath, output.outputPath);
      } else {
        await rm(output.outputPath, { force: true });
      }
    }),
  );
}

async function validatePreparedOutputs(outputs: PreparedConversionOutput[]): Promise<void> {
  await Promise.all(
    outputs.flatMap((output) => [
      assertExistingPathInWorkspace(output.stagedOutputPath, output.workspacePath),
      assertWritablePathInWorkspace(output.outputPath, output.workspacePath),
    ]),
  );
}

async function findExistingOutputs(
  outputs: PreparedConversionOutput[],
): Promise<PreparedConversionOutput[]> {
  const existence = await Promise.all(outputs.map((output) => pathExists(output.outputPath)));
  return outputs.filter((_output, index) => existence[index]);
}

async function findAvailableOutputPath(
  requestedPath: string,
  reservedPaths: Set<string>,
): Promise<string> {
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
    throw error;
  }
}

async function filesHaveEqualContents(firstPath: string, secondPath: string): Promise<boolean> {
  const [first, second] = await Promise.all([readFile(firstPath), readFile(secondPath)]);
  return first.equals(second);
}

function isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
