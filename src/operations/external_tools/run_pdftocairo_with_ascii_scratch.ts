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
  platform?: NodeJS.Platform | undefined;
  scratchBaseCandidates?: readonly string[] | undefined;
}

export async function runPdftocairoWithAsciiScratch(options: {
  sourcePath: string;
  outputPath: string;
  scratchOutputFileName: 'output.png' | 'output.svg';
  run: (sourcePath: string, outputPath: string) => Promise<void>;
  scratch: PdfToolScratchOptions;
  signal: AbortSignal | undefined;
  outputChannel: LineOutputChannel | undefined;
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
    outputChannel: options.outputChannel,
    ...(options.signal !== undefined && { signal: options.signal }),
  });

  try {
    options.signal?.throwIfAborted();
    await copyFile(options.sourcePath, scratch.inputPath);
    options.signal?.throwIfAborted();
    await validateAsciiScratchInput(scratch, 'pdftocairo');

    options.outputChannel?.appendLine(`[scratch] logical input: ${options.sourcePath}`);
    options.outputChannel?.appendLine(`[scratch] tool input: ${scratch.inputPath}`);
    options.outputChannel?.appendLine(`[scratch] tool output: ${scratch.outputPath}`);
    options.outputChannel?.appendLine(`[scratch] staged output: ${options.outputPath}`);

    await options.run(scratch.inputPath, scratch.outputPath);
    options.signal?.throwIfAborted();
    await validateAsciiScratchOutput(scratch);
    options.signal?.throwIfAborted();
    await copyFile(scratch.outputPath, options.outputPath);
    options.signal?.throwIfAborted();
    await removeSuccessfulScratch(scratch, options.outputChannel);
  } catch (error) {
    options.outputChannel?.appendLine(`[scratch] retained after failure: ${scratch.rootPath}`);
    throw error instanceof Error ? error : new Error(String(error));
  }
}
