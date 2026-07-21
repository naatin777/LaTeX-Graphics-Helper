import { lstat, mkdtemp, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export interface LineOutputChannel {
  appendLine: (message: string) => void;
}

export interface AsciiScratch {
  rootPath: string;
  inputPath: string;
}

export interface AsciiInputOutputScratch extends AsciiScratch {
  outputPath: string;
}

export function defaultWindowsScratchBaseCandidates(): string[] {
  const candidates = [os.tmpdir()];
  const systemRoot = process.env.SystemRoot;

  if (systemRoot) {
    candidates.push(path.join(systemRoot, 'Temp'));
  }

  return [...new Set(candidates.map((candidate) => path.resolve(candidate)))];
}

export async function createAsciiInputScratch(options: {
  baseCandidates: readonly string[];
  inputFileName: string;
  signal?: AbortSignal;
  outputChannel?: LineOutputChannel | undefined;
  toolName?: string;
}): Promise<AsciiScratch> {
  assertAsciiFileName(options.inputFileName);

  for (const candidate of new Set(options.baseCandidates.map((item) => path.resolve(item)))) {
    options.signal?.throwIfAborted();
    let scratchRootPath: string | undefined;

    try {
      const realBasePath = await validateScratchBase(candidate);
      options.signal?.throwIfAborted();
      scratchRootPath = await mkdtemp(path.join(candidate, 'latex-graphics-helper-'));
      await validateScratchRoot(scratchRootPath, realBasePath);

      const inputPath = path.join(scratchRootPath, options.inputFileName);
      assertAsciiAbsolutePath(inputPath);

      return { rootPath: scratchRootPath, inputPath };
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }

      if (scratchRootPath) {
        await rm(scratchRootPath, { recursive: true, force: true }).catch(() => undefined);
      }

      options.outputChannel?.appendLine(`[scratch] rejected base: ${candidate} (${errorMessage(error)})`);
    }
  }

  throw new Error(`Could not create an ASCII temporary directory for ${options.toolName ?? 'Ghostscript'}.`);
}

export async function createAsciiInputOutputScratch(options: {
  baseCandidates: readonly string[];
  inputFileName: string;
  outputFileName: string;
  signal?: AbortSignal;
  outputChannel?: LineOutputChannel | undefined;
  toolName?: string;
}): Promise<AsciiInputOutputScratch> {
  assertAsciiFileName(options.outputFileName);
  const scratch = await createAsciiInputScratch(options);
  const outputPath = path.join(scratch.rootPath, options.outputFileName);
  assertAsciiAbsolutePath(outputPath);

  return { ...scratch, outputPath };
}

export async function validateAsciiScratchInput(scratch: AsciiScratch, toolName = 'Ghostscript'): Promise<void> {
  const [rootStats, inputStats, realRootPath, realInputPath] = await Promise.all([
    lstat(scratch.rootPath),
    lstat(scratch.inputPath),
    realpath(scratch.rootPath),
    realpath(scratch.inputPath),
  ]);

  if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
    throw new Error(`${toolName} scratch root is not a regular directory.`);
  }

  if (!inputStats.isFile() || inputStats.isSymbolicLink() || inputStats.size === 0) {
    throw new Error(`${toolName} scratch input is not a non-empty regular file.`);
  }

  assertAsciiAbsolutePath(scratch.rootPath);
  assertAsciiAbsolutePath(scratch.inputPath);
  assertContained(realInputPath, realRootPath);
}

export async function validateAsciiScratchOutput(scratch: AsciiInputOutputScratch): Promise<void> {
  const [rootStats, outputStats, realRootPath, realOutputPath] = await Promise.all([
    lstat(scratch.rootPath),
    lstat(scratch.outputPath),
    realpath(scratch.rootPath),
    realpath(scratch.outputPath),
  ]);

  if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
    throw new Error('External tool scratch root is not a regular directory.');
  }

  if (!outputStats.isFile() || outputStats.isSymbolicLink() || outputStats.size === 0) {
    throw new Error('External tool scratch output is not a non-empty regular file.');
  }

  assertAsciiAbsolutePath(scratch.rootPath);
  assertAsciiAbsolutePath(scratch.outputPath);
  assertContained(realOutputPath, realRootPath);
}

export async function removeSuccessfulScratch(
  scratch: AsciiScratch,
  outputChannel?: LineOutputChannel | undefined,
): Promise<void> {
  try {
    await rm(scratch.rootPath, { recursive: true, force: true });
  } catch (error) {
    outputChannel?.appendLine(`[scratch] warning: could not remove ${scratch.rootPath} (${errorMessage(error)})`);
  }
}

async function validateScratchBase(candidate: string): Promise<string> {
  assertAsciiAbsolutePath(candidate);
  await assertNoSymbolicLinkComponents(candidate);
  const [stats, realBasePath] = await Promise.all([lstat(candidate), realpath(candidate)]);

  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error('Scratch base is not a regular directory.');
  }

  assertAsciiAbsolutePath(realBasePath);
  return realBasePath;
}

async function validateScratchRoot(rootPath: string, realBasePath: string): Promise<void> {
  const [stats, realRootPath] = await Promise.all([lstat(rootPath), realpath(rootPath)]);

  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error('Scratch root is not a regular directory.');
  }

  assertAsciiAbsolutePath(rootPath);
  assertAsciiAbsolutePath(realRootPath);
  assertContained(realRootPath, realBasePath);
}

async function assertNoSymbolicLinkComponents(targetPath: string): Promise<void> {
  const rootPath = path.parse(targetPath).root;
  const relativePath = path.relative(rootPath, targetPath);
  let currentPath = rootPath;

  for (const component of relativePath.split(path.sep).filter(Boolean)) {
    currentPath = path.join(currentPath, component);
    const stats = await lstat(currentPath);

    if (stats.isSymbolicLink()) {
      throw new Error('Scratch base contains a symbolic link.');
    }
  }
}

function assertAsciiFileName(fileName: string): void {
  if (path.basename(fileName) !== fileName || !isAsciiPath(fileName)) {
    throw new Error('Scratch file name must contain only ASCII characters.');
  }
}

function assertAsciiAbsolutePath(targetPath: string): void {
  if (!path.isAbsolute(targetPath) || !isAsciiPath(targetPath)) {
    throw new Error('Scratch path must be an absolute ASCII path.');
  }
}

function isAsciiPath(targetPath: string): boolean {
  return /^[\x20-\x7e]+$/u.test(targetPath);
}

function assertContained(targetPath: string, parentPath: string): void {
  const relativePath = path.relative(parentPath, targetPath);
  const isInside =
    relativePath === '' ||
    (!path.isAbsolute(relativePath) && relativePath !== '..' && !relativePath.startsWith(`..${path.sep}`));

  if (!isInside) {
    throw new Error('Scratch path is outside the selected temporary directory.');
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
