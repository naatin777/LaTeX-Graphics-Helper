import { copyFile, lstat, mkdir } from 'node:fs/promises';
import path from 'node:path';

import { assertExistingPathInWorkspace, assertWritablePathInWorkspace } from '../security/workspace_path.js';

import {
  createAsciiInputOutputScratch,
  defaultWindowsScratchBaseCandidates,
  removeSuccessfulScratch,
  validateAsciiScratchInput,
  validateAsciiScratchOutput,
  type LineOutputChannel,
} from './external_tool_ascii_scratch.js';
import { runExternalTool, type ExternalToolResult } from './run_external_tool.js';

export type RunGhostscriptForEps = (
  executable: string,
  args: string[],
  signal?: AbortSignal,
) => Promise<ExternalToolResult>;

export async function convertEpsToPdf(options: {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
  ghostscriptPath: string;
  runGhostscript?: RunGhostscriptForEps;
  signal?: AbortSignal;
  platform?: NodeJS.Platform;
  scratchBaseCandidates?: readonly string[];
  outputChannel?: LineOutputChannel;
}): Promise<void> {
  options.signal?.throwIfAborted();
  await assertExistingPathInWorkspace(options.sourcePath, options.workspacePath);
  await assertWritablePathInWorkspace(options.outputPath, options.workspacePath);
  await mkdir(path.dirname(options.outputPath), { recursive: true });
  const stagedInputPath = path.join(path.dirname(options.outputPath), 'source.eps');

  const runGhostscript = options.runGhostscript ?? executeGhostscript;
  const platform = options.platform ?? process.platform;

  options.signal?.throwIfAborted();
  await copyFile(options.sourcePath, stagedInputPath);
  options.signal?.throwIfAborted();

  if (platform !== 'win32') {
    await assertExistingPathInWorkspace(stagedInputPath, options.workspacePath);
    options.signal?.throwIfAborted();
    await runGhostscript(options.ghostscriptPath, ghostscriptArgs(stagedInputPath, options.outputPath), options.signal);
    options.signal?.throwIfAborted();
    await assertNonEmptyFile(options.outputPath);
    return;
  }

  const scratch = await createAsciiInputOutputScratch({
    baseCandidates: options.scratchBaseCandidates ?? defaultWindowsScratchBaseCandidates(),
    inputFileName: 'input.eps',
    outputFileName: 'output.pdf',
    ...(options.signal !== undefined && { signal: options.signal }),
    ...(options.outputChannel !== undefined && { outputChannel: options.outputChannel }),
    toolName: 'Ghostscript',
  });

  try {
    options.signal?.throwIfAborted();
    await copyFile(stagedInputPath, scratch.inputPath);
    options.signal?.throwIfAborted();
    await validateAsciiScratchInput(scratch, 'Ghostscript');
    options.outputChannel?.appendLine(`[scratch] logical input: ${options.sourcePath}`);
    options.outputChannel?.appendLine(`[scratch] tool input: ${scratch.inputPath}`);
    options.outputChannel?.appendLine(`[scratch] tool output: ${scratch.outputPath}`);
    options.outputChannel?.appendLine(`[scratch] staged output: ${options.outputPath}`);

    options.signal?.throwIfAborted();
    await runGhostscript(
      options.ghostscriptPath,
      ghostscriptArgs(scratch.inputPath, scratch.outputPath),
      options.signal,
    );
    options.signal?.throwIfAborted();
    await validateAsciiScratchOutput(scratch);
    options.signal?.throwIfAborted();
    await copyFile(scratch.outputPath, options.outputPath);
    options.signal?.throwIfAborted();
    await removeSuccessfulScratch(scratch, options.outputChannel);
  } catch (error) {
    options.outputChannel?.appendLine(`[scratch] retained after failure: ${scratch.rootPath}`);
    throw error;
  }
}

function ghostscriptArgs(sourcePath: string, outputPath: string): string[] {
  return [
    '-dSAFER',
    '-dBATCH',
    '-dNOPAUSE',
    '-dEPSCrop',
    '-sDEVICE=pdfwrite',
    `-sOutputFile=${outputPath}`,
    sourcePath,
  ];
}

async function executeGhostscript(
  executable: string,
  args: string[],
  signal?: AbortSignal,
): Promise<ExternalToolResult> {
  return runExternalTool({ toolName: 'Ghostscript', executable, args, ...(signal !== undefined && { signal }) });
}

async function assertNonEmptyFile(filePath: string): Promise<void> {
  const stats = await lstat(filePath);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.size === 0) {
    throw new Error(`Ghostscript output is not a non-empty regular file: ${filePath}`);
  }
}
