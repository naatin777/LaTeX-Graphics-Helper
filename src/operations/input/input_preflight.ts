import { open, readFile, stat } from 'node:fs/promises';
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

  const fileSize = fileStat.size;

  if (!fileStat.isFile) {
    return { sourcePath, format, fileSize, result: 'error', reason: 'Input is not a regular file' };
  }

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

  if (isDrawioPath(sourcePath)) {
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
  let handle;

  try {
    handle = await open(sourcePath, 'r');
    const headerBuffer = Buffer.alloc(5);
    const { bytesRead } = await handle.read(headerBuffer, 0, headerBuffer.length, 0);
    const header = headerBuffer.subarray(0, bytesRead).toString('utf8');

    if (header !== '%PDF-') {
      return { sourcePath, format, fileSize, result: 'error', reason: 'Not a valid PDF file' };
    }

    // Lightweight check only. Deeper validation (pages, encryption, MediaBox)
    // is done by the conversion operation when it processes the PDF.
    return { sourcePath, format, fileSize, result: 'ok', details: { fileSize } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { sourcePath, format, fileSize, result: 'error', reason: `PDF read failed: ${message}` };
  } finally {
    await handle?.close();
  }
}

async function validateRasterInput(
  sourcePath: string,
  format: SourceFormat,
  fileSize: number,
): Promise<PreflightReport> {
  const details: Record<string, unknown> = { fileSize };
  const image = sharp(sourcePath);

  try {
    // metadata() reads image headers without decoding compressed pixels. Destroy
    // the Sharp stream explicitly so Windows does not retain the input handle.
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

    details.width = metadata.width;
    details.height = metadata.height;
    details.format = metadata.format;

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
    image.destroy();
  }
}

async function validateSvgInput(
  sourcePath: string,
  format: SourceFormat,
  fileSize: number,
): Promise<PreflightReport> {
  try {
    const content = (await readFile(sourcePath, 'utf8')).trim();

    if (content.length === 0) {
      return { sourcePath, format, fileSize, result: 'error', reason: 'Empty SVG file' };
    }

    if (!content.includes('<svg') && !content.includes('<SVG')) {
      return {
        sourcePath,
        format,
        fileSize,
        result: 'warning',
        reason: 'SVG root element not found — may not be a valid SVG',
      };
    }

    const hasViewBox = /viewBox\s*=\s*["'][^"']+["']/i.test(content);
    const hasDimensions = /(?:width|height)\s*=\s*["']\d+/i.test(content);

    if (!hasViewBox && !hasDimensions) {
      return {
        sourcePath,
        format,
        fileSize,
        result: 'warning',
        reason: 'SVG has no viewBox or width/height attributes',
      };
    }

    return { sourcePath, format, fileSize, result: 'ok', details: { fileSize } };
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
    const content = (await readFile(sourcePath, 'utf8')).trim();

    if (content.length === 0) {
      return { sourcePath, format, fileSize, result: 'error', reason: 'Empty Mermaid file' };
    }

    return {
      sourcePath,
      format,
      fileSize,
      result: 'ok',
      details: { fileSize, lines: content.split('\n').length },
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
    // Embedded PNG/SVG content is validated by the Draw.io conversion path.
    // Do not decode binary image bytes as a UTF-8 string during preflight.
    if (isEditableDrawioImagePath(sourcePath)) {
      return { sourcePath, format, fileSize, result: 'ok', details: { fileSize } };
    }

    const content = (await readFile(sourcePath, 'utf8')).trim();

    if (content.length === 0) {
      return { sourcePath, format, fileSize, result: 'error', reason: 'Empty Draw.io file' };
    }

    if (!content.includes('<mxGraphModel') && !content.includes('mxfile')) {
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

async function readFilePrefix(filePath: string, bytes: number): Promise<Buffer> {
  const handle = await open(filePath, 'r');

  try {
    const buffer = Buffer.alloc(bytes);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

async function safeStat(filePath: string): Promise<{ size: number; isFile: boolean; error?: string }> {
  try {
    const fileStat = await stat(filePath);
    return { size: fileStat.size, isFile: fileStat.isFile() };
  } catch (error) {
    return { size: 0, isFile: false, error: error instanceof Error ? error.message : String(error) };
  }
}
