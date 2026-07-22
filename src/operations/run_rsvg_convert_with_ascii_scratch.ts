import { copyFile, lstat } from 'node:fs/promises';

import {
  createAsciiInputOutputScratch,
  defaultWindowsScratchBaseCandidates,
  removeSuccessfulScratch,
  validateAsciiScratchInput,
  validateAsciiScratchOutput,
  type LineOutputChannel,
} from './external_tool_ascii_scratch.js';

export interface RsvgToolScratchOptions {
  platform?: NodeJS.Platform;
  scratchBaseCandidates?: readonly string[];
  outputChannel?: LineOutputChannel;
}

export type RunRsvgConvert = (executable: string, args: string[], signal?: AbortSignal) => Promise<void>;

export async function runRsvgConvertWithAsciiScratch(options: {
  executable: string;
  sourcePath: string;
  outputPath: string;
  run: RunRsvgConvert;
  scratch: RsvgToolScratchOptions;
  signal?: AbortSignal;
}): Promise<void> {
  if (options.scratch.platform !== 'win32') {
    await options.run(options.executable, rsvgConvertArgs(options.sourcePath, options.outputPath), options.signal);
    await validateNonEmptyRegularFile(options.outputPath);
    return;
  }

  const scratchArgs: Parameters<typeof createAsciiInputOutputScratch>[0] = {
    baseCandidates: options.scratch.scratchBaseCandidates ?? defaultWindowsScratchBaseCandidates(),
    inputFileName: 'input.svg',
    outputFileName: 'output.pdf',
    toolName: 'rsvg-convert',
  };
  if (options.signal !== undefined) scratchArgs.signal = options.signal;
  if (options.scratch.outputChannel !== undefined) scratchArgs.outputChannel = options.scratch.outputChannel;
  const scratch = await createAsciiInputOutputScratch(scratchArgs);

  try {
    options.signal?.throwIfAborted();
    await copyFile(options.sourcePath, scratch.inputPath);
    options.signal?.throwIfAborted();
    await validateAsciiScratchInput(scratch, 'rsvg-convert');

    options.scratch.outputChannel?.appendLine(`[scratch] logical input: ${options.sourcePath}`);
    options.scratch.outputChannel?.appendLine(`[scratch] tool input: ${scratch.inputPath}`);
    options.scratch.outputChannel?.appendLine(`[scratch] tool output: ${scratch.outputPath}`);
    options.scratch.outputChannel?.appendLine(`[scratch] staged output: ${options.outputPath}`);

    await options.run(options.executable, rsvgConvertArgs(scratch.inputPath, scratch.outputPath), options.signal);
    options.signal?.throwIfAborted();
    await validateAsciiScratchOutput(scratch);
    options.signal?.throwIfAborted();
    await copyFile(scratch.outputPath, options.outputPath);
    options.signal?.throwIfAborted();
    await removeSuccessfulScratch(scratch, options.scratch.outputChannel);
  } catch (error) {
    options.scratch.outputChannel?.appendLine(`[scratch] retained after failure: ${scratch.rootPath}`);
    throw error;
  }
}

function rsvgConvertArgs(sourcePath: string, outputPath: string): string[] {
  return ['--format=pdf', '--output', outputPath, sourcePath];
}

async function validateNonEmptyRegularFile(filePath: string): Promise<void> {
  const stats = await lstat(filePath);

  if (!stats.isFile() || stats.isSymbolicLink() || stats.size === 0) {
    throw new Error('rsvg-convert output is not a non-empty regular file.');
  }
}
