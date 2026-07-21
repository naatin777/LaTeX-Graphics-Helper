import { execFile } from 'node:child_process';
import { copyFile, mkdir, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import type { LineOutputChannel } from './external_tool_ascii_scratch.js';
import {
  createAsciiInputScratch,
  defaultWindowsScratchBaseCandidates,
  removeSuccessfulScratch,
  validateAsciiScratchInput,
} from './external_tool_ascii_scratch.js';

const execFileAsync = promisify(execFile);

export interface EpsToPdfResult {
  pdfPath: string;
  stagingDirectory: string;
}

export interface EpsToPdfOptions {
  epsPath: string;
  workspacePath: string;
  ghostscriptPath: string;
  stagingDirectory: string;
  signal?: AbortSignal;
  outputChannel?: LineOutputChannel;
  platform?: NodeJS.Platform;
  scratchBaseCandidates?: readonly string[];
  timeout?: number;
  maxOutputSize?: number;
}

/**
 * Converts an EPS file to a single-page PDF via Ghostscript.
 * Returns the path to the generated PDF and the staging directory for cleanup.
 */
export async function convertEpsToPdf(options: EpsToPdfOptions): Promise<EpsToPdfResult> {
  options.signal?.throwIfAborted();

  const platform = options.platform ?? process.platform;
  const pixbuf = options.timeout ?? 30_000;
  const maxOutputSize = options.maxOutputSize ?? 100 * 1024 * 1024;

  await mkdir(options.stagingDirectory, { recursive: true });

  // Copy EPS to staging
  const stagingEpsPath = path.join(options.stagingDirectory, 'source.eps');
  await copyFile(options.epsPath, stagingEpsPath);
  options.signal?.throwIfAborted();

  const pdfPath = path.join(options.stagingDirectory, 'eps-result.pdf');

  // Windows: use ASCII scratch for Ghostscript
  let ghostscriptInputPath = stagingEpsPath;

  if (platform === 'win32') {
    const scratchOptions: Parameters<typeof createAsciiInputScratch>[0] = {
      baseCandidates: options.scratchBaseCandidates ?? defaultWindowsScratchBaseCandidates(),
      inputFileName: 'source.eps',
      toolName: 'Ghostscript',
    };
    if (options.signal !== undefined) { scratchOptions.signal = options.signal; }
    if (options.outputChannel !== undefined) { scratchOptions.outputChannel = options.outputChannel; }
    const scratch = await createAsciiInputScratch(scratchOptions);
    await validateAsciiScratchInput(scratch);
    ghostscriptInputPath = scratch.inputPath;
    options.outputChannel?.appendLine(`[scratch] logical input: ${options.epsPath}`);
    options.outputChannel?.appendLine(`[scratch] tool input: ${scratch.inputPath}`);

    try {
      options.signal?.throwIfAborted();

      await executeGhostscript(
        options.ghostscriptPath,
        [
          '-dSAFER',
          '-dNOPAUSE',
          '-dBATCH',
          '-dEPSCrop',
          '-sDEVICE=pdfwrite',
          `-sOutputFile=${pdfPath}`,
          ghostscriptInputPath,
        ],
        pixbuf,
        options.signal,
      );

      options.signal?.throwIfAborted();
      await validateGeneratedPdf(pdfPath, maxOutputSize);
      options.signal?.throwIfAborted();

      return { pdfPath, stagingDirectory: options.stagingDirectory };
    } finally {
      await removeSuccessfulScratch(scratch);
    }
  }

  // Non-Windows: execute Ghostscript directly
  await executeGhostscript(
    options.ghostscriptPath,
    [
      '-dSAFER',
      '-dNOPAUSE',
      '-dBATCH',
      '-dEPSCrop',
      '-sDEVICE=pdfwrite',
      `-sOutputFile=${pdfPath}`,
      ghostscriptInputPath,
    ],
    pixbuf,
    options.signal,
  );

  options.signal?.throwIfAborted();
  await validateGeneratedPdf(pdfPath, maxOutputSize);

  return { pdfPath, stagingDirectory: options.stagingDirectory };
}

/**
 * Validates that the output PDF from Ghostscript is valid:
 * - File exists and is non-empty
 * - Can be parsed as PDF (starts with %PDF)
 * - File size is within limits
 */
async function validateGeneratedPdf(pdfPath: string, maxSize: number): Promise<void> {
  const fileStat = await stat(pdfPath);

  if (!fileStat.isFile()) {
    throw new Error(`EPS conversion produced no output: ${pdfPath}`);
  }

  if (fileStat.size === 0) {
    throw new Error(`EPS conversion produced empty PDF: ${pdfPath}`);
  }

  if (fileStat.size > maxSize) {
    throw new Error(
      `EPS conversion output exceeds size limit (${(fileStat.size / 1024 / 1024).toFixed(1)} MB > ${(maxSize / 1024 / 1024).toFixed(0)} MB)`,
    );
  }

  // Fast check: PDF must start with %PDF
  const header = readFileSync(pdfPath, { encoding: 'utf8' }).slice(0, 5);

  if (header !== '%PDF-') {
    throw new Error(`EPS conversion produced non-PDF output: ${pdfPath}`);
  }
}

/**
 * Performs a minimal preflight check on an EPS file.
 */
export function validateEpsInput(epsPath: string): void {
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  const head = readFileSync(epsPath, { encoding: 'utf8' }).slice(0, 1024);

  if (!head.startsWith('%!PS-Adobe-') && !head.startsWith('%!PS')) {
    throw new Error(`Not a valid EPS file (missing PostScript header): ${epsPath}`);
  }

  // Check BoundingBox presence
  const bbMatch = head.match(/%%BoundingBox:\s*(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)/);

  if (bbMatch) {
    const llx = parseInt(bbMatch[1]!, 10);
    const lly = parseInt(bbMatch[2]!, 10);
    const urx = parseInt(bbMatch[3]!, 10);
    const ury = parseInt(bbMatch[4]!, 10);

    if (llx >= urx || lly >= ury) {
      throw new Error(
        `Invalid BoundingBox in EPS (llx=${llx} >= urx=${urx} or lly=${lly} >= ury=${ury}): ${epsPath}`,
      );
    }

    if (urx - llx > 100_000 || ury - lly > 100_000) {
      throw new Error(
        `EPS BoundingBox dimensions exceed limits (${urx - llx}x${ury - lly}): ${epsPath}`,
      );
    }
  }
}

async function executeGhostscript(
  executable: string,
  args: string[],
  timeout: number,
  signal?: AbortSignal,
): Promise<void> {
  await execFileAsync(executable, args, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    timeout,
    signal,
  });
}
