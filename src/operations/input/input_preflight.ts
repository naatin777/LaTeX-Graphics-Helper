import { once } from 'node:events';
import { createReadStream } from 'node:fs';
import { open, stat } from 'node:fs/promises';
import path from 'node:path';

import pLimit from 'p-limit';
import sharp from 'sharp';

import {
  isDrawioPath,
  isEditableDrawioImagePath,
  isMermaidPath,
  isRasterImagePath,
  sourceFormatForPath,
  type SourceFormat,
} from '../../application/policy/source_format.js';
import { validateEpsInput } from '../conversion/eps_to_pdf.js';
import type { LineOutputChannel } from '../external_tools/external_tool_ascii_scratch.js';

export type PreflightResult = 'ok' | 'warning' | 'error';

export interface PreflightReport {
  sourcePath: string;
  format: SourceFormat | undefined;
  fileSize: number;
  result: PreflightResult;
  reason?: string;
  details?: Record<string, unknown>;
}

export interface BatchPreflightResult {
  reports: PreflightReport[];
  errors: PreflightReport[];
  warnings: PreflightReport[];
  canProceed: boolean;
}

const PREFLIGHT_CONCURRENCY = 2;
const EPS_INSPECTION_BYTES = 64 * 1024;

export type PreflightValidator = (sourcePath: string) => Promise<PreflightReport>;

export interface PreflightBatchOptions {
  signal?: AbortSignal;
  validate?: PreflightValidator;
}

export async function runPreflightBatch(
  sourcePaths: string[],
  options: PreflightBatchOptions = {},
): Promise<BatchPreflightResult> {
  const validate = options.validate ?? runPreflight;
  options.signal?.throwIfAborted();

  const reports: PreflightReport[] = [];
  reports.length = sourcePaths.length;
  const limit = pLimit(PREFLIGHT_CONCURRENCY);

  await Promise.all(
    sourcePaths.map((sourcePath, index) =>
      limit(async () => {
        options.signal?.throwIfAborted();

        try {
          const report = await validate(sourcePath);
          options.signal?.throwIfAborted();
          reports[index] = report;
        } catch (error) {
          if (options.signal?.aborted) {
            options.signal.throwIfAborted();
          }

          throw error instanceof Error ? error : new Error(String(error));
        }
      }),
    ),
  );

  options.signal?.throwIfAborted();
  const errors = reports.filter((report) => report.result === 'error');
  const warnings = reports.filter((report) => report.result === 'warning');
  return { reports, errors, warnings, canProceed: errors.length === 0 };
}

/**
 * Runs preflight on all source files and throws if any error is found.
 * Warning-only results are logged to outputChannel but do not block.
 */
export async function assertPreflightPassed(
  jobs: { sourcePath: string }[],
  outputChannel?: LineOutputChannel,
  signal?: AbortSignal,
): Promise<void> {
  const sourcePaths = jobs.map((job) => job.sourcePath);
  const result = await runPreflightBatch(sourcePaths, signal !== undefined ? { signal } : {});

  for (const report of result.reports) {
    outputChannel?.appendLine(
      `[preflight] ${report.sourcePath}: ${report.result}${report.reason ? ' — ' + report.reason : ''}`,
    );
  }

  if (!result.canProceed) {
    const reasons = result.errors
      .map((error) => `${error.sourcePath}: ${error.reason ?? 'unknown error'}`)
      .join('\n');
    throw new Error(`Preflight validation failed:\n${reasons}`);
  }
}

async function runPreflight(sourcePath: string): Promise<PreflightReport> {
  const format = sourceFormatForPath(sourcePath);

  if (format === undefined) {
    return {
      sourcePath,
      format,
      fileSize: 0,
      result: 'error',
      reason: `Unsupported format: ${path.extname(sourcePath)}`,
    };
  }

  const fileStat = await safeStat(sourcePath);

  if (fileStat.error !== undefined) {
    return {
      sourcePath,
      format,
      fileSize: 0,
      result: 'error',
      reason: 'File not readable',
      details: { error: fileStat.error },
    };
  }

  if (!fileStat.isFile) {
    return {
      sourcePath,
      format,
      fileSize: fileStat.size,
      result: 'error',
      reason: 'Input is not a regular file',
    };
  }

  const fileSize = fileStat.size;

  if (fileSize === 0) {
    return { sourcePath, format, fileSize, result: 'error', reason: 'Empty file' };
  }

  if (format === 'pdf') {
    return validatePdfInput(sourcePath, format, fileSize);
  }

  if (isRasterImagePath(sourcePath)) {
    return validateRasterInput(sourcePath, format, fileSize);
  }

  if (format === 'svg') {
    return validateSvgInput(sourcePath, format, fileSize);
  }

  if (isMermaidPath(sourcePath)) {
    return validateMermaidInput(sourcePath, format, fileSize);
  }

  if (isDrawioPath(sourcePath) || isEditableDrawioImagePath(sourcePath)) {
    return validateDrawioInput(sourcePath, format, fileSize);
  }

  if (format === 'eps') {
    return validateEpsPreflight(sourcePath, format, fileSize);
  }

  return { sourcePath, format, fileSize, result: 'ok' };
}

async function validatePdfInput(
  sourcePath: string,
  format: SourceFormat,
  fileSize: number,
): Promise<PreflightReport> {
  try {
    const header = (await readFilePrefix(sourcePath, 5)).toString('utf8');

    if (header !== '%PDF-') {
      return { sourcePath, format, fileSize, result: 'error', reason: 'Not a valid PDF file' };
    }

    // Lightweight check only. Deeper validation (pages, encryption, MediaBox)
    // is done by the conversion operation when it processes the PDF.
    return { sourcePath, format, fileSize, result: 'ok', details: { fileSize } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { sourcePath, format, fileSize, result: 'error', reason: `PDF read failed: ${message}` };
  }
}

async function validateRasterInput(
  sourcePath: string,
  format: SourceFormat,
  fileSize: number,
): Promise<PreflightReport> {
  const image = sharp(sourcePath, { limitInputPixels: false });

  try {
    // metadata() reads image headers without decoding compressed pixels.
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height || metadata.width <= 0 || metadata.height <= 0) {
      return {
        sourcePath,
        format,
        fileSize,
        result: 'error',
        reason: 'Could not read image dimensions',
      };
    }

    const details: Record<string, unknown> = {
      fileSize,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
    };

    if (metadata.pages !== undefined && metadata.pages > 1) {
      return {
        sourcePath,
        format,
        fileSize,
        result: 'warning',
        reason: `Image has ${metadata.pages} pages/frames. Only the first page will be converted.`,
        details: { ...details, pages: metadata.pages },
      };
    }

    return { sourcePath, format, fileSize, result: 'ok', details };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { sourcePath, format, fileSize, result: 'error', reason: `Image validation failed: ${message}` };
  } finally {
    await destroySharpInput(image);
  }
}

async function validateSvgInput(
  sourcePath: string,
  format: SourceFormat,
  fileSize: number,
): Promise<PreflightReport> {
  try {
    const root = createSubstringScanner(['<svg'], true);
    const scan = await scanTextFile(sourcePath, (chunk) => root.feed(chunk));

    if (!scan.hasNonWhitespace) {
      return { sourcePath, format, fileSize, result: 'error', reason: 'Empty SVG file' };
    }

    if (!root.found()) {
      return {
        sourcePath,
        format,
        fileSize,
        result: 'warning',
        reason: 'SVG root element not found — may not be a valid SVG',
      };
    }

    const image = sharp(sourcePath, { limitInputPixels: false });
    try {
      const metadata = await image.metadata();
      if (!metadata.width || !metadata.height || metadata.width <= 0 || metadata.height <= 0) {
        return {
          sourcePath,
          format,
          fileSize,
          result: 'warning',
          reason: 'SVG has no usable width/height or viewBox',
        };
      }

      return {
        sourcePath,
        format,
        fileSize,
        result: 'ok',
        details: { fileSize, width: metadata.width, height: metadata.height },
      };
    } catch {
      return {
        sourcePath,
        format,
        fileSize,
        result: 'warning',
        reason: 'SVG dimensions could not be determined',
      };
    } finally {
      await destroySharpInput(image);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { sourcePath, format, fileSize, result: 'error', reason: `SVG read failed: ${message}` };
  }
}

async function validateMermaidInput(
  sourcePath: string,
  format: SourceFormat,
  fileSize: number,
): Promise<PreflightReport> {
  try {
    const scan = await scanTextFile(sourcePath);

    if (!scan.hasNonWhitespace) {
      return { sourcePath, format, fileSize, result: 'error', reason: 'Empty Mermaid file' };
    }

    return {
      sourcePath,
      format,
      fileSize,
      result: 'ok',
      details: { fileSize, lines: scan.lineCount },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { sourcePath, format, fileSize, result: 'error', reason: `Mermaid read failed: ${message}` };
  }
}

async function validateDrawioInput(
  sourcePath: string,
  format: SourceFormat,
  fileSize: number,
): Promise<PreflightReport> {
  try {
    // Embedded Draw.io PNG/SVG files are binary or XML image containers. Their
    // actual editability is verified by the Draw.io conversion itself.
    if (isEditableDrawioImagePath(sourcePath)) {
      return { sourcePath, format, fileSize, result: 'ok', details: { fileSize } };
    }

    const structure = createSubstringScanner(['<mxGraphModel', 'mxfile']);
    const scan = await scanTextFile(sourcePath, (chunk) => structure.feed(chunk));

    if (!scan.hasNonWhitespace) {
      return { sourcePath, format, fileSize, result: 'error', reason: 'Empty Draw.io file' };
    }

    if (!structure.found()) {
      return {
        sourcePath,
        format,
        fileSize,
        result: 'warning',
        reason: 'Draw.io XML structure not found — may not be a valid diagram',
      };
    }

    return { sourcePath, format, fileSize, result: 'ok', details: { fileSize } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { sourcePath, format, fileSize, result: 'error', reason: `Draw.io read failed: ${message}` };
  }
}

async function validateEpsPreflight(
  sourcePath: string,
  format: SourceFormat,
  fileSize: number,
): Promise<PreflightReport> {
  try {
    await validateEpsInput(sourcePath);

    const head = (await readFilePrefix(sourcePath, EPS_INSPECTION_BYTES)).toString('utf8');
    if (/^%%BoundingBox:\s*\(atend\)\s*$/m.test(head)) {
      return {
        sourcePath,
        format,
        fileSize,
        result: 'warning',
        reason: 'EPS BoundingBox is deferred until conversion output validation.',
        details: { fileSize, boundingBox: 'atend' },
      };
    }

    return { sourcePath, format, fileSize, result: 'ok', details: { fileSize } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { sourcePath, format, fileSize, result: 'error', reason: message };
  }
}

interface TextScanResult {
  hasNonWhitespace: boolean;
  lineCount: number;
}

async function scanTextFile(filePath: string, inspect?: (chunk: string) => void): Promise<TextScanResult> {
  const stream = createReadStream(filePath, { encoding: 'utf8' });
  let hasNonWhitespace = false;
  let lineCount = 1;

  for await (const chunk of stream) {
    const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    hasNonWhitespace ||= /\S/u.test(text);
    lineCount += countOccurrences(text, '\n');
    inspect?.(text);
  }

  return { hasNonWhitespace, lineCount: hasNonWhitespace ? lineCount : 0 };
}

interface TextScanner {
  feed: (chunk: string) => void;
  found: () => boolean;
}

function createSubstringScanner(tokens: readonly string[], caseInsensitive = false): TextScanner {
  const normalizedTokens = caseInsensitive ? tokens.map((token) => token.toLowerCase()) : [...tokens];
  const maxTokenLength = Math.max(...normalizedTokens.map((token) => token.length));
  let tail = '';
  let matched = false;

  return {
    feed(chunk) {
      if (matched) {
        return;
      }

      const candidate = tail + (caseInsensitive ? chunk.toLowerCase() : chunk);
      matched = normalizedTokens.some((token) => candidate.includes(token));
      tail = candidate.slice(-Math.max(0, maxTokenLength - 1));
    },
    found() {
      return matched;
    },
  };
}

async function readFilePrefix(filePath: string, maxBytes: number): Promise<Buffer> {
  const handle = await open(filePath, 'r');

  try {
    const buffer = Buffer.alloc(maxBytes);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

async function destroySharpInput(image: ReturnType<typeof sharp>): Promise<void> {
  if (image.destroyed) {
    return;
  }

  const closed = once(image, 'close');
  image.destroy();
  await closed;
}

async function safeStat(filePath: string): Promise<{ size: number; isFile: boolean; error?: string }> {
  try {
    const fileStat = await stat(filePath);
    return { size: fileStat.size, isFile: fileStat.isFile() };
  } catch (error) {
    return { size: 0, isFile: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function countOccurrences(value: string, character: string): number {
  let count = 0;
  for (const current of value) {
    if (current === character) {
      count += 1;
    }
  }
  return count;
}
