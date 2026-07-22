import { lstat, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

import { assertWritablePathInWorkspace } from '../security/workspace_path.js';

import type { LineOutputChannel } from './external_tool_ascii_scratch.js';

export interface ConversionArtifactRoot {
  rootPath: string;
  workspacePath: string;
  preservePaths?: readonly string[];
}

export interface CleanupPreservingError {
  readonly cleanupPreservePaths?: readonly string[];
}

export function stagingArtifactsForJobs(
  jobs: readonly { workspacePath: string }[],
  operation: string,
  runId: string,
): ConversionArtifactRoot[] {
  return [
    ...new Map(
      jobs.map((job) => {
        const rootPath = path.join(job.workspacePath, '.latex-graphics-helper', operation, runId);
        return [rootPath, { rootPath, workspacePath: job.workspacePath }];
      }),
    ).values(),
  ];
}

export async function cleanupConversionArtifacts(
  artifacts: readonly ConversionArtifactRoot[],
  outputChannel?: LineOutputChannel,
  failure?: unknown,
): Promise<void> {
  const inheritedPreservePaths = getCleanupPreservePaths(failure);
  const artifactsWithInheritedPreserves = artifacts.map((artifact) => ({
    ...artifact,
    preservePaths: [
      ...(artifact.preservePaths ?? []),
      ...inheritedPreservePaths.filter((preservePath) => isWithin(preservePath, artifact.rootPath)),
    ],
  }));

  for (const artifact of deduplicateArtifacts(artifactsWithInheritedPreserves)) {
    try {
      await removeUnusedArtifactEntries(artifact);
    } catch (error) {
      outputChannel?.appendLine(
        `[cleanup] failed for ${artifact.rootPath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export async function withStagingCleanup<T>(
  artifacts: readonly ConversionArtifactRoot[],
  operation: () => Promise<T>,
  outputChannel?: LineOutputChannel,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    await cleanupConversionArtifacts(artifacts, outputChannel, error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

function getCleanupPreservePaths(error: unknown): readonly string[] {
  if (!isCleanupPreservingError(error)) {
    return [];
  }

  return error.cleanupPreservePaths ?? [];
}

function isCleanupPreservingError(error: unknown): error is CleanupPreservingError {
  if (typeof error !== 'object' || error === null || !('cleanupPreservePaths' in error)) {
    return false;
  }

  const preservePaths = (error as { cleanupPreservePaths?: unknown }).cleanupPreservePaths;
  return (
    preservePaths === undefined ||
    (Array.isArray(preservePaths) && preservePaths.every((value): value is string => typeof value === 'string'))
  );
}

async function removeUnusedArtifactEntries(artifact: ConversionArtifactRoot): Promise<void> {
  const rootPath = path.resolve(artifact.rootPath);
  const preservePaths = (artifact.preservePaths ?? []).map((value) => path.resolve(value));

  await assertWritablePathInWorkspace(rootPath, artifact.workspacePath);

  for (const preservePath of preservePaths) {
    await assertWritablePathInWorkspace(preservePath, artifact.workspacePath);

    if (!isWithin(preservePath, rootPath)) {
      throw new Error(`Preserved artifact is outside its staging root: ${preservePath}`);
    }
  }

  await removePath(rootPath, new Set(preservePaths), artifact.workspacePath);
}

async function removePath(
  targetPath: string,
  preservePaths: ReadonlySet<string>,
  workspacePath: string,
): Promise<void> {
  const normalizedPath = path.resolve(targetPath);

  if (preservePaths.has(normalizedPath)) {
    return;
  }

  let stat;

  try {
    stat = await lstat(normalizedPath);
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return;
    }

    throw error instanceof Error ? error : new Error(String(error));
  }

  await assertWritablePathInWorkspace(normalizedPath, workspacePath);

  if (!stat.isDirectory() || stat.isSymbolicLink() || !hasPreservedDescendant(normalizedPath, preservePaths)) {
    await rm(normalizedPath, {
      recursive: stat.isDirectory() && !stat.isSymbolicLink(),
      force: true,
    });
    return;
  }

  const entries = await readdir(normalizedPath);

  for (const entry of entries) {
    await removePath(path.join(normalizedPath, entry), preservePaths, workspacePath);
  }

  const remainingEntries = await readdir(normalizedPath);

  if (remainingEntries.length === 0) {
    await rm(normalizedPath, { force: true });
  }
}

function deduplicateArtifacts(artifacts: readonly ConversionArtifactRoot[]): ConversionArtifactRoot[] {
  const byRoot = new Map<string, ConversionArtifactRoot>();

  for (const artifact of artifacts) {
    const rootPath = path.resolve(artifact.rootPath);
    const current = byRoot.get(rootPath);

    if (!current) {
      byRoot.set(rootPath, { ...artifact, rootPath });
      continue;
    }

    byRoot.set(rootPath, {
      ...current,
      preservePaths: [...new Set([...(current.preservePaths ?? []), ...(artifact.preservePaths ?? [])])],
    });
  }

  return [...byRoot.values()];
}

function hasPreservedDescendant(targetPath: string, preservePaths: ReadonlySet<string>): boolean {
  return [...preservePaths].some((preservePath) => isWithin(preservePath, targetPath));
}

function isWithin(targetPath: string, parentPath: string): boolean {
  const relativePath = path.relative(parentPath, targetPath);
  return relativePath === '' || (!path.isAbsolute(relativePath) && !relativePath.startsWith(`..${path.sep}`));
}

function isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
