import path from 'node:path';

import { defaultGhostscriptPath } from '../config/external_tool_paths.js';
import { isEpsPath } from '../application/source_format.js';

import { convertEpsToPdf, type RunGhostscriptForEps } from './convert_eps_to_pdf.js';
import type { PdfToolScratchOptions } from './run_pdftocairo_with_ascii_scratch.js';

export interface SourceInputOptions {
  ghostscriptPath: string;
  runGhostscript?: RunGhostscriptForEps;
}

export interface SourceInputContext {
  sourceInput: SourceInputOptions;
  scratch: PdfToolScratchOptions;
  signal?: AbortSignal | undefined;
}

export function defaultSourceInputOptions(platform = process.platform): SourceInputOptions {
  return { ghostscriptPath: defaultGhostscriptPath(platform) };
}

export async function prepareSourceForRasterOutput(options: {
  sourcePath: string;
  stageDirectory: string;
  workspacePath: string;
  context: SourceInputContext;
}): Promise<string> {
  if (!isEpsPath(options.sourcePath)) {
    return options.sourcePath;
  }

  const outputPath = path.join(options.stageDirectory, 'source.pdf');
  await convertEpsToPdf({
    sourcePath: options.sourcePath,
    outputPath,
    workspacePath: options.workspacePath,
    ghostscriptPath: options.context.sourceInput.ghostscriptPath,
    ...(options.context.sourceInput.runGhostscript !== undefined && {
      runGhostscript: options.context.sourceInput.runGhostscript,
    }),
    ...(options.context.signal !== undefined && { signal: options.context.signal }),
    ...(options.context.scratch.platform !== undefined && { platform: options.context.scratch.platform }),
    ...(options.context.scratch.scratchBaseCandidates !== undefined && {
      scratchBaseCandidates: options.context.scratch.scratchBaseCandidates,
    }),
    ...(options.context.scratch.outputChannel !== undefined && {
      outputChannel: options.context.scratch.outputChannel,
    }),
  });
  return outputPath;
}
