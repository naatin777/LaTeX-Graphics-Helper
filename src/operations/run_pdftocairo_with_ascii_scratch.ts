import { copyFile } from 'node:fs/promises';

import {
  createAsciiInputOutputScratch,
  defaultWindowsScratchBaseCandidates,
  removeSuccessfulScratch,
  validateAsciiScratchInput,
  validateAsciiScratchOutput,
  type LineOutputChannel,
} from './external_tool_ascii_scratch.js';

export interface PdfToolScratchOptions {
  platform?: NodeJS.Platform;
  scratchBaseCandidates?: readonly string[];
  outputChannel?: LineOutputChannel;
}

export async function runPdftocairoWithAsciiScratch(options: {
  sourcePath: string;
  outputPath: string;
  scratchOutputFileName: 'output.png' | 'output.svg';
  run: (sourcePath: string, outputPath: string) => Promise<void>;
  scratch: PdfToolScratchOptions;
  signal?: AbortSignal;
}): Promise<void> {
  if (options.scratch.platform !== 'win32') {
    await options.run(options.sourcePath, options.outputPath);
    return;
  }

  const scratch = await createAsciiInputOutputScratch({
    baseCandidates: options.scratch.scratchBaseCandidates ?? defaultWindowsScratchBaseCandidates(),
    inputFileName: 'input.pdf',
    outputFileName: options.scratchOutputFileName,
    toolName: 'pdftocairo',
    ...(options.signal !== undefined && { signal: options.signal }),
    ...(options.scratch.outputChannel !== undefined && {
      outputChannel: options.scratch.outputChannel,
    }),
  });

  try {
    options.signal?.throwIfAborted();
    await copyFile(options.sourcePath, scratch.inputPath);
    options.signal?.throwIfAborted();
    await validateAsciiScratchInput(scratch, 'pdftocairo');

    options.scratch.outputChannel?.appendLine(`[scratch] logical input: ${options.sourcePath}`);
    options.scratch.outputChannel?.appendLine(`[scratch] tool input: ${scratch.inputPath}`);
    options.scratch.outputChannel?.appendLine(`[scratch] tool output: ${scratch.outputPath}`);
    options.scratch.outputChannel?.appendLine(`[scratch] staged output: ${options.outputPath}`);

    await options.run(scratch.inputPath, scratch.outputPath);
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
