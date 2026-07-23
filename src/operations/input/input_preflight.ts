import { createReadStream } from 'node:fs';
import { open, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import pLimit from 'p-limit';
import { PDFDocument } from 'pdf-lib';
import { Parser } from 'xml2js';

import {
  isDrawioPath,
  isEditableDrawioImagePath,
  isMermaidPath,
  isRasterImagePath,
  sourceFormatForPath,
  type SourceFormat,
} from '../../application/policy/source_format.js';
import { DEFAULT_MAX_INPUT_PIXELS } from '../../config/raster_input.js';
import { validateEpsInput } from '../conversion/eps_to_pdf.js';
import type { LineOutputChannel } from '../external_tools/external_tool_ascii_scratch.js';
import {
  destroyRasterInput,
  isRasterInputPixelLimitError,
  openRasterInput,
  rasterInputPixelLimitMessage,
} from '../conversion/raster_input.js';
import type { ConversionRuntime } from '../lifecycle/conversion_runtime.js';

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

export type ConfirmWarningsHandler = (warnings: PreflightReport[]) => Promise<boolean>;

export interface AssertPreflightPassedOptions {
  outputChannel?: LineOutputChannel;
  signal?: AbortSignal;
  maxInputPixels?: number;
  onProgress?: (completed: number, total: number) => void;
  onConfirmWarnings?: ConfirmWarningsHandler;
}

const PREFLIGHT_CONCURRENCY = 2;
const EPS_INSPECTION_BYTES = 64 * 1024;

export type PreflightValidator = (sourcePath: string) => Promise<PreflightReport>;

export interface PreflightBatchOptions {
  signal?: AbortSignal;
  maxInputPixels?: number;
  validate?: PreflightValidator;
  onProgress?: (completed: number, total: number) => void;
}

export async function runPreflightBatch(
  sourcePaths: string[],
  options: PreflightBatchOptions = {},
): Promise<BatchPreflightResult> {
  const maxInputPixels = options.maxInputPixels ?? DEFAULT_MAX_INPUT_PIXELS;
  const total = sourcePaths.length;
  let completed = 0;
  options.signal?.throwIfAborted();

  const reports: PreflightReport[] = [];
  reports.length = sourcePaths.length;
  const limit = pLimit(PREFLIGHT_CONCURRENCY);

  await Promise.all(
    sourcePaths.map((sourcePath, index) =>
      limit(async () => {
        options.signal?.throwIfAborted();

        try {
          const report =
            options.validate === undefined
              ? await runPreflight(sourcePath, maxInputPixels, options.signal)
              : await options.validate(sourcePath);
          options.signal?.throwIfAborted();
          reports[index] = report;
          completed += 1;
          options.onProgress?.(completed, total);
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

function formatPreflightReport(report: PreflightReport): string {
  let line = `[preflight] ${report.sourcePath}: ${report.result}`;
  if (report.reason) {
    line += ` — ${report.reason}`;
  }
  if (report.details) {
    const detailParts: string[] = [];
    for (const [key, value] of Object.entries(report.details)) {
      if (key !== 'fileSize' && value !== undefined) {
        detailParts.push(key + '=' + JSON.stringify(value));
      }
    }
    if (detailParts.length > 0) {
      line += ` [${detailParts.join(', ')}]`;
    }
  }
  return line;
}

/**
 * Runs preflight on all source files and throws if any error is found.
 * Warning-only results are logged to outputChannel but do not block.
 * When onConfirmWarnings is provided and warnings exist, the handler is
 * called to decide whether to proceed. If it returns false, the operation
 * is cancelled via AbortError.
 */
export function preflightOptionsFromRuntime(runtime?: ConversionRuntime): AssertPreflightPassedOptions {
  const options: AssertPreflightPassedOptions = {};
  if (runtime?.outputChannel !== undefined) {
    options.outputChannel = runtime.outputChannel;
  }
  if (runtime?.signal !== undefined) {
    options.signal = runtime.signal;
  }
  if (runtime?.onConfirmWarnings !== undefined) {
    options.onConfirmWarnings = runtime.onConfirmWarnings;
  }
  return options;
}

export async function assertPreflightPassed(
  jobs: { sourcePath: string }[],
  options?: AssertPreflightPassedOptions,
): Promise<void> {
  const sourcePaths = jobs.map((job) => job.sourcePath);
  const batchOptions: PreflightBatchOptions = {};
  if (options?.signal !== undefined) {
    batchOptions.signal = options.signal;
  }
  if (options?.maxInputPixels !== undefined) {
    batchOptions.maxInputPixels = options.maxInputPixels;
  }
  if (options?.onProgress !== undefined) {
    batchOptions.onProgress = options.onProgress;
  }
  const result = await runPreflightBatch(sourcePaths, batchOptions);

  for (const report of result.reports) {
    options?.outputChannel?.appendLine(formatPreflightReport(report));
  }

  if (result.warnings.length > 0 && options?.onConfirmWarnings !== undefined) {
    const proceed = await options.onConfirmWarnings(result.warnings);
    if (!proceed) {
      const error = new DOMException('Cancelled by user after preflight warnings', 'AbortError');
      throw error;
    }
  }

  if (!result.canProceed) {
    const reasons = result.errors.map((error) => `${error.sourcePath}: ${error.reason ?? 'unknown error'}`).join('\n');
    throw new Error(`Preflight validation failed:\n${reasons}`);
  }
}

async function runPreflight(
  sourcePath: string,
  maxInputPixels: number,
  signal?: AbortSignal,
): Promise<PreflightReport> {
  signal?.throwIfAborted();
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
    return validateRasterInput(sourcePath, format, fileSize, maxInputPixels, signal);
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

async function validatePdfInput(sourcePath: string, format: SourceFormat, fileSize: number): Promise<PreflightReport> {
  try {
    const header = (await readFilePrefix(sourcePath, 5)).toString('utf8');

    if (header !== '%PDF-') {
      return { sourcePath, format, fileSize, result: 'error', reason: 'Not a valid PDF file' };
    }

    const inputBuffer = await readFile(sourcePath);
    const pdfDoc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();
    const details: Record<string, unknown> = { fileSize, pageCount };

    if (pageCount === 0) {
      return { sourcePath, format, fileSize, result: 'error', reason: 'PDF has no pages', details };
    }

    if (pdfDoc.isEncrypted) {
      details.encrypted = true;
      return { sourcePath, format, fileSize, result: 'error', reason: 'PDF is encrypted', details };
    }

    try {
      const pages = pdfDoc.getPages();
      const invalidBoxes: number[] = [];
      for (let i = 0; i < pages.length; i += 1) {
        const box = pages[i]!.getMediaBox();
        if (!isFinite(box.width) || !isFinite(box.height) || box.width <= 0 || box.height <= 0) {
          invalidBoxes.push(i + 1);
        }
      }
      if (invalidBoxes.length > 0) {
        details.invalidPageBoxes = invalidBoxes;
        return {
          sourcePath,
          format,
          fileSize,
          result: 'warning',
          reason: `PDF page(s) ${invalidBoxes.join(', ')} have invalid MediaBox`,
          details,
        };
      }
    } catch {
      return { sourcePath, format, fileSize, result: 'warning', reason: 'Could not verify PDF page boxes', details };
    }

    return { sourcePath, format, fileSize, result: 'ok', details };
  } catch (error) {
    if (error instanceof Error && error.message.includes('encrypted')) {
      return {
        sourcePath,
        format,
        fileSize,
        result: 'error',
        reason: 'PDF is encrypted and cannot be processed',
        details: { fileSize, encrypted: true },
      };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { sourcePath, format, fileSize, result: 'error', reason: `PDF read failed: ${message}` };
  }
}

async function validateRasterInput(
  sourcePath: string,
  format: SourceFormat,
  fileSize: number,
  maxInputPixels: number,
  signal?: AbortSignal,
): Promise<PreflightReport> {
  signal?.throwIfAborted();
  const image = openRasterInput(sourcePath, maxInputPixels);
  let dimensions: { width: number; height: number } | undefined;

  try {
    signal?.throwIfAborted();
    const metadata = await image.metadata();
    signal?.throwIfAborted();

    if (!metadata.width || !metadata.height || metadata.width <= 0 || metadata.height <= 0) {
      return {
        sourcePath,
        format,
        fileSize,
        result: 'error',
        reason: 'Could not read image dimensions',
      };
    }

    dimensions = { width: metadata.width, height: metadata.height };
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
        result: 'ok',
        details: { ...details, pages: metadata.pages },
      };
    }

    return { sourcePath, format, fileSize, result: 'ok', details };
  } catch (error) {
    signal?.throwIfAborted();
    const message = error instanceof Error ? error.message : String(error);
    const reason = isRasterInputPixelLimitError(error)
      ? rasterInputPixelLimitMessage(maxInputPixels, dimensions)
      : `Image validation failed: ${message}`;
    return { sourcePath, format, fileSize, result: 'error', reason };
  } finally {
    await destroyRasterInput(image);
    signal?.throwIfAborted();
  }
}

async function validateSvgInput(sourcePath: string, format: SourceFormat, fileSize: number): Promise<PreflightReport> {
  try {
    const inputBuffer = await readFile(sourcePath);
    const text = inputBuffer.toString('utf8');

    if (!/\S/u.test(text)) {
      return { sourcePath, format, fileSize, result: 'error', reason: 'Empty SVG file' };
    }

    const details: Record<string, unknown> = { fileSize };

    const xmlResult = await parseSvgXmlStructure(text);

    if (xmlResult.hasSvgRoot === false) {
      return {
        sourcePath,
        format,
        fileSize,
        result: 'warning',
        reason: 'SVG root element not found — may not be a valid SVG',
        details,
      };
    }

    const hasDim = xmlResult.width !== undefined || xmlResult.height !== undefined || xmlResult.viewBox !== undefined;
    if (!hasDim) {
      return {
        sourcePath,
        format,
        fileSize,
        result: 'warning',
        reason: 'SVG has no width, height, or viewBox attribute',
        details,
      };
    }

    if (xmlResult.width !== undefined) {
      details.width = xmlResult.width;
    }
    if (xmlResult.height !== undefined) {
      details.height = xmlResult.height;
    }
    if (xmlResult.viewBox !== undefined) {
      details.viewBox = xmlResult.viewBox;
    }

    return { sourcePath, format, fileSize, result: 'ok', details };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { sourcePath, format, fileSize, result: 'error', reason: `SVG read failed: ${message}` };
  }
}

interface SvgXmlParseResult {
  hasSvgRoot: boolean;
  width?: string;
  height?: string;
  viewBox?: string;
  error?: string;
}

async function parseSvgXmlStructure(text: string): Promise<SvgXmlParseResult> {
  try {
    const parser = new Parser({
      explicitChildren: false,
      explicitArray: true,
      ignoreAttrs: false,
      mergeAttrs: false,
    });
    const result = await parser.parseStringPromise(text);

    if (!result?.svg) {
      return { hasSvgRoot: false };
    }

    const attrs = result.svg.$ ?? {};
    return {
      hasSvgRoot: true,
      width: attrs.width,
      height: attrs.height,
      viewBox: attrs.viewBox,
    };
  } catch {
    const fallbackSvg = /<\s*svg[\s>]/iu.test(text);
    if (!fallbackSvg) {
      return { hasSvgRoot: false };
    }
    return { hasSvgRoot: true, error: 'SVG XML parse failed — structural validation incomplete' };
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
