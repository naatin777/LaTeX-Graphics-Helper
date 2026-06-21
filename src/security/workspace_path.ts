import { lstat, realpath } from "node:fs/promises";
import path from "node:path";

export async function assertExistingPathInWorkspace(
  targetPath: string,
  workspacePath: string,
): Promise<void> {
  assertLogicalPathInWorkspace(targetPath, workspacePath);

  const [realWorkspacePath, realTargetPath] = await Promise.all([
    realpath(workspacePath),
    realpath(targetPath),
  ]);

  assertContained(realTargetPath, realWorkspacePath, targetPath);
}

export async function assertWritablePathInWorkspace(
  targetPath: string,
  workspacePath: string,
): Promise<void> {
  assertLogicalPathInWorkspace(targetPath, workspacePath);

  const realWorkspacePath = await realpath(workspacePath);
  const existingPath = await findNearestExistingPath(targetPath);
  const realExistingPath = await realpath(existingPath);

  assertContained(realExistingPath, realWorkspacePath, targetPath);
}

function assertLogicalPathInWorkspace(targetPath: string, workspacePath: string): void {
  assertContained(path.resolve(targetPath), path.resolve(workspacePath), targetPath);
}

function assertContained(targetPath: string, workspacePath: string, originalPath: string): void {
  const relativePath = path.relative(workspacePath, targetPath);
  const isInside =
    relativePath === "" ||
    (!path.isAbsolute(relativePath) &&
      relativePath !== ".." &&
      !relativePath.startsWith(`..${path.sep}`));

  if (!isInside) {
    throw new Error(`File operation is outside the workspace: ${originalPath}`);
  }
}

async function findNearestExistingPath(targetPath: string): Promise<string> {
  let candidatePath = path.resolve(targetPath);

  while (true) {
    try {
      await lstat(candidatePath);
      return candidatePath;
    } catch (error) {
      if (!isFileNotFoundError(error)) {
        throw error;
      }
    }

    const parentPath = path.dirname(candidatePath);

    if (parentPath === candidatePath) {
      throw new Error(`Could not find an existing parent for: ${targetPath}`);
    }

    candidatePath = parentPath;
  }
}

function isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
