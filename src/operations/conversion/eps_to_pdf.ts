import { execFile } from 'node:child_process';
import { copyFile, mkdir, open, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { PDFDocument } from 'pdf-lib';

import type { LineOutputChannel } from '../external_tools/external_tool_ascii_scratch.js';
import {
  createAsciiInputOutputScratch,
  defaultWindowsScratchBaseCandidates,
  removeSuccessfulScratch,
  validateAsciiScratchInput,
  validateAsciiScratchOutput,
} from '../external_tools/external_tool_ascii_scratch.js';

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
  runGhostscript?: RunGhostscript;
}

export type RunGhostscript = (
  executable: string,
  args: string[],
  timeout: number,
  signal?: AbortSignal,
) => Promise<void>;

/**
 * Converts an EPS file to a single-page PDF via Ghostscript.
 * Returns the path to the generated PDF and the staging directory for cleanup.
 */
export async function convertEpsToPdf(options: EpsToPdfOptions): Promise<EpsToPdfResult> {
  options.signal?.throwIfAborted();

  const platform = options.platform ?? process.platform;
  const pixbuf = options.timeout ?? 30_000;
  const runGhostscript = options.runGhostscript ?? executeGhostscript;

  await mkdir(options.stagingDirectory, { recursive: true });

  const stagingEpsPath = path.join(options.stagingDirectory, 'source.eps');
  await copyFile(options.epsPath, stagingEpsPath);
  options.signal?.throwIfAborted();

  const pdfPath = path.join(options.stagingDirectory, 'eps-result.pdf');
  let ghostscriptInputPath = stagingEpsPath;
  let ghostscriptOutputPath = pdfPath;

  if (platform === 'win32') {
    const scratchOptions: Parameters<typeof createAsciiInputOutputScratch>[0] = {
      baseCandidates: options.scratchBaseCandidates ?? defaultWindowsScratchBaseCandidates(),
      inputFileName: 'source.eps',
      outputFileName: 'output.pdf',
      toolName: 'Ghostscript',
    };
    if (options.signal !== undefined) {
      scratchOptions.signal = options.signal;
    }
    if (options.outputChannel !== undefined) {
      scratchOptions.outputChannel = options.outputChannel;
    }
    const scratch = await createAsciiInputOutputScratch(scratchOptions);
    let scratchSucceeded = false;

    try {
      await copyFile(stagingEpsPath, scratch.inputPath);
      await validateAsciiScratchInput(scratch);
      ghostscriptInputPath = scratch.inputPath;
      ghostscriptOutputPath = scratch.outputPath;
      options.outputChannel?.appendLine(`[scratch] logical input: ${options.epsPath}`);
      options.outputChannel?.appendLine(`[scratch] tool input: ${scratch.inputPath}`);
      options.outputChannel?.appendLine(`[scratch] tool output: ${scratch.outputPath}`);
      options.signal?.throwIfAborted();

      await runGhostscript(
        options.ghostscriptPath,
        [
          '-dSAFER',
          '-dNOPAUSE',
          '-dBATCH',
          '-dEPSCrop',
          '-sDEVICE=pdfwrite',
          `-sOutputFile=${ghostscriptOutputPath}`,
          ghostscriptInputPath,
        ],
        pixbuf,
        options.signal,
      );

      options.signal?.throwIfAborted();
      await validateAsciiScratchOutput(scratch);
      await validateGeneratedPdf(ghostscriptOutputPath);
      options.signal?.throwIfAborted();
      await copyFile(ghostscriptOutputPath, pdfPath);
      options.signal?.throwIfAborted();
      await validateGeneratedPdf(pdfPath);
      options.signal?.throwIfAborted();
      options.outputChannel?.appendLine(`[scratch] staged output: ${pdfPath}`);
      scratchSucceeded = true;

      return { pdfPath, stagingDirectory: options.stagingDirectory };
    } finally {
      if (scratchSucceeded) {
        await removeSuccessfulScratch(scratch, options.outputChannel);
      } else {
        options.outputChannel?.appendLine(`[scratch] retained after failure or cancellation: ${scratch.rootPath}`);
      }
    }
  }

  await runGhostscript(
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
  await validateGeneratedPdf(pdfPath);

  return { pdfPath, stagingDirectory: options.stagingDirectory };
}

async function validateGeneratedPdf(pdfPath: string): Promise<void> {
  const fileStat = await stat(pdfPath);

  if (!fileStat.isFile()) {
    throw new Error(`EPS conversion produced no output: ${pdfPath}`);
  }

  if (fileStat.size === 0) {
    throw new Error(`EPS conversion produced empty PDF: ${pdfPath}`);
  }

  const pdfBytes = await readFile(pdfPath);
  const header = pdfBytes.subarray(0, 5).toString('ascii');

  if (header !== '%PDF-') {
    throw new Error(`EPS conversion produced non-PDF output: ${pdfPath}`);
  }

  let document: PDFDocument;

  try {
    document = await PDFDocument.load(pdfBytes);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`EPS conversion produced an unparsable PDF: ${message}`, { cause: error });
  }

  let pageCount: number;

  try {
    pageCount = document.getPageCount();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`EPS conversion produced an unparsable PDF: ${message}`, { cause: error });
  }

  if (pageCount !== 1) {
    throw new Error(`EPS conversion must produce exactly one PDF page (found ${pageCount}): ${pdfPath}`);
  }

  let page;

  try {
    page = document.getPage(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`EPS conversion produced an unparsable PDF: ${message}`, { cause: error });
  }
  const pageBoxes = [
    ['MediaBox', page.getMediaBox()],
    ['CropBox', page.getCropBox()],
    ['TrimBox', page.getTrimBox()],
  ] as const;

  for (const [boxName, box] of pageBoxes) {
    const values = [box.x, box.y, box.width, box.height];

    if (!values.every(Number.isFinite) || box.width <= 0 || box.height <= 0) {
      throw new Error(`EPS conversion produced invalid ${boxName} dimensions: ${pdfPath}`);
    }
  }
}

/** Performs a minimal preflight check on an EPS file. */
export async function validateEpsInput(epsPath: string): Promise<void> {
  const handle = await open(epsPath, 'r');
  let head: string;

  try {
    const buffer = Buffer.alloc(1024);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    head = buffer.subarray(0, bytesRead).toString('utf8');
  } finally {
    await handle.close();
  }

  if (!head.startsWith('%!PS-Adobe-') && !head.startsWith('%!PS')) {
    throw new Error(`Not a valid EPS file (missing PostScript header): ${epsPath}`);
  }

  const bbMatch = head.match(/^%%BoundingBox:\s*(.*?)\s*$/m);

  if (!bbMatch) {
    throw new Error(`Missing BoundingBox in EPS: ${epsPath}`);
  }

  const boundingBox = bbMatch[1]!.trim();

  if (boundingBox === '(atend)') {
    return;
  }

  const values = boundingBox.split(/\s+/u);

  if (values.length !== 4 || values.some((value) => !/^-?\d+$/u.test(value))) {
    throw new Error(`Invalid BoundingBox in EPS: ${epsPath}`);
  }

  const numericValues = values.map((value) => Number(value));
  const llx = numericValues[0] ?? Number.NaN;
  const lly = numericValues[1] ?? Number.NaN;
  const urx = numericValues[2] ?? Number.NaN;
  const ury = numericValues[3] ?? Number.NaN;

  if (
    ![llx, lly, urx, ury].every(Number.isInteger) ||
    [llx, lly, urx, ury].some((value) => value < -(2 ** 31) || value > 2 ** 31 - 1) ||
    llx >= urx ||
    lly >= ury
  ) {
    throw new Error(`Invalid BoundingBox in EPS (llx=${llx}, lly=${lly}, urx=${urx}, ury=${ury}): ${epsPath}`);
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
