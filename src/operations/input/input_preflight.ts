import { readFileSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
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
  format: SourceFormat;
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

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
const MAX_PIXEL_COUNT = 100_000_000; // 100 MPixel
const PREFLIGHT_CONCURRENCY = 2;

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
  const errors = reports.filter((r) => r.result === 'error');
  const warnings = reports.filter((r) => r.result === 'warning');
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
  const sourcePaths = jobs.map((j) => j.sourcePath);
  const result = await runPreflightBatch(sourcePaths, signal !== undefined ? { signal } : {});

  for (const report of result.reports) {
    outputChannel?.appendLine(
      `[preflight] ${report.sourcePath}: ${report.result}${report.reason ? ' — ' + report.reason : ''}`,
    );
  }

  if (!result.canProceed) {
    const reasons = result.errors.map((e) => e.reason ?? 'unknown error').join('\n');
    throw new Error(`Preflight validation failed:\n${reasons}`);
  }
}

async function runPreflight(sourcePath: string): Promise<PreflightReport> {
  const format = sourceFormatForPath(sourcePath);
  const fileSize = safeStatSync(sourcePath).size;

  if (format === undefined) {
    return {
      sourcePath,
      format: 'pdf' as SourceFormat, // placeholder
      fileSize,
      result: 'error',
      reason: `Unsupported format: ${path.extname(sourcePath)}`,
    };
  }

  if (fileSize === 0) {
    return { sourcePath, format, fileSize, result: 'error', reason: 'Empty file' };
  }

  if (fileSize > MAX_FILE_SIZE) {
    return {
      sourcePath,
      format,
      fileSize,
      result: 'error',
      reason: `File size ${formatSize(fileSize)} exceeds limit (${formatSize(MAX_FILE_SIZE)})`,
      details: { fileSize, limit: MAX_FILE_SIZE },
    };
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

// ── PDF ──

async function validatePdfInput(sourcePath: string, format: SourceFormat, fileSize: number): Promise<PreflightReport> {
  try {
    const header = readFileSync(sourcePath).slice(0, 5).toString('utf8');

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

// ── Raster ──

async function validateRasterInput(
  sourcePath: string,
  format: SourceFormat,
  fileSize: number,
): Promise<PreflightReport> {
  const details: Record<string, unknown> = { fileSize };

  try {
    // Read the file before handing it to libvips. Passing a path directly can
    // retain a Windows file handle beyond metadata(), which blocks the
    // conversion that immediately follows preflight for WebP inputs.
    const sourceBuffer = await readFile(sourcePath);
    const metadata = await sharp(sourceBuffer).metadata();

    if (!metadata.width || !metadata.height || metadata.width <= 0 || metadata.height <= 0) {
      return {
        sourcePath,
        format,
        fileSize,
        result: 'error',
        reason: `Could not read image dimensions`,
      };
    }

    details.width = metadata.width;
    details.height = metadata.height;
    details.format = metadata.format;

    const pixelCount = metadata.width * metadata.height;

    if (pixelCount > MAX_PIXEL_COUNT) {
      return {
        sourcePath,
        format,
        fileSize,
        result: 'warning',
        reason: `Image dimensions ${metadata.width}x${metadata.height} (${formatPixelCount(pixelCount)}) exceed recommended limit (${formatPixelCount(MAX_PIXEL_COUNT)})`,
        details,
      };
    }

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
  }
}

// ── SVG ──

function validateSvgInput(sourcePath: string, format: SourceFormat, fileSize: number): PreflightReport {
  try {
    const content = readFileSync(sourcePath, 'utf8').trim();

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

// ── Mermaid ──

function validateMermaidInput(sourcePath: string, format: SourceFormat, fileSize: number): PreflightReport {
  try {
    const content = readFileSync(sourcePath, 'utf8').trim();

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

// ── Draw.io ──

function validateDrawioInput(sourcePath: string, format: SourceFormat, fileSize: number): PreflightReport {
  try {
    const content = readFileSync(sourcePath, 'utf8').trim();

    if (content.length === 0) {
      return { sourcePath, format, fileSize, result: 'error', reason: 'Empty Draw.io file' };
    }

    // editable PNG/SVG won't have XML structure
    if (isEditableDrawioImagePath(sourcePath)) {
      return { sourcePath, format, fileSize, result: 'ok', details: { fileSize } };
    }

    if (!content.includes('<mxGraphModel') && !content.includes('<mxfile') && !content.includes('mxfile')) {
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

// ── EPS ──

function validateEpsPreflight(sourcePath: string, format: SourceFormat, fileSize: number): PreflightReport {
  try {
    validateEpsInput(sourcePath);

    const head = readFileSync(sourcePath, 'utf8').slice(0, 64 * 1024);
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

// ── Helpers ──

function safeStatSync(filePath: string): { size: number } {
  try {
    return statSync(filePath);
  } catch {
    return { size: -1 };
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  const mb = kb / 1024;

  return `${mb.toFixed(1)} MB`;
}

function formatPixelCount(pixels: number): string {
  return `${(pixels / 1_000_000).toFixed(1)} MPixel`;
}
