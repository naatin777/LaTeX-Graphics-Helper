import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { run as runMermaidCli } from '@mermaid-js/mermaid-cli';
import { PDFDocument, type PDFPage } from 'pdf-lib';
import {
  launch,
  type Browser,
  type ChromeReleaseChannel,
  type LaunchOptions,
  type SupportedBrowser,
} from 'puppeteer-core';
import sharp from 'sharp';
import { errorMessage, isAbortError } from '../../commands/shared/command_utils.js';

import { isEditableDrawioImagePath, isMermaidPath } from '../../application/policy/source_format.js';
import { convertEpsToPdf } from './eps_to_pdf.js';
import { assertPreflightPassed, preflightOptionsFromRuntime } from '../input/input_preflight.js';
import { assertExistingPathInWorkspace, assertWritablePathInWorkspace } from '../../security/workspace_path.js';

import {
  type CommittedConversionOutput,
  type PreparedConversionOutput,
} from '../lifecycle/commit_conversion_outputs.js';
import type { ConversionRuntime } from '../lifecycle/conversion_runtime.js';
import { createMermaidCliRenderOptions } from './mermaid_render_options.js';
import { runExternalTool } from '../external_tools/run_external_tool.js';
import {
  runRsvgConvertWithAsciiScratch,
  type RsvgToolScratchOptions,
  type RunRsvgConvert,
} from '../external_tools/run_rsvg_convert_with_ascii_scratch.js';
import { runStagedConversionBatch } from '../lifecycle/run_staged_conversion_batch.js';

const DEFAULT_SUPPORTED_IMAGE_EXTENSIONS = ['.png'] as const;
const SVG_EXTENSION = '.svg';
const execFileAsync = promisify(execFile);

export type SvgToPdfEngine = 'puppeteer' | 'rsvg-convert';

export interface SvgToPdfOptions {
  engine: SvgToPdfEngine;
  rsvgConvertPath: string;
  puppeteerBrowser: SupportedBrowser;
  puppeteerBrowserChannel: ChromeReleaseChannel;
  puppeteerExecutablePath?: string;
  runRsvgConvert?: RunRsvgConvert;
}

export function validateSvgToPdfOptions(options: SvgToPdfOptions): void {
  if (options.engine === 'puppeteer' && options.puppeteerBrowser === 'firefox' && !options.puppeteerExecutablePath) {
    throw new Error('puppeteer.executablePath must be set when puppeteer.browser is firefox.');
  }
}

export function createSvgPuppeteerLaunchOptions(options: SvgToPdfOptions): LaunchOptions {
  validateSvgToPdfOptions(options);

  return {
    headless: true,
    env: puppeteerLaunchEnv(),
    browser: options.puppeteerBrowser,
    ...(options.puppeteerExecutablePath
      ? { executablePath: options.puppeteerExecutablePath }
      : { channel: options.puppeteerBrowserChannel }),
  };
}

export interface MermaidPuppeteerOptions {
  browserChannel: string;
  executablePath?: string;
  theme: string;
  backgroundColor: string;
}

export interface DrawioToPdfOptions {
  drawioPath: string;
  runDrawio?: RunDrawio;
}

export type RunDrawio = (executable: string, args: string[], signal?: AbortSignal) => Promise<void>;

export interface ConvertToPdfJob {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
}

export interface WriteSourceAsPdfOptions {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
  signal?: AbortSignal;
  svgToPdf?: SvgToPdfOptions;
  mermaid?: MermaidPuppeteerOptions;
  drawio?: DrawioToPdfOptions;
  scratchOptions?: RsvgToolScratchOptions;
  ghostscriptPath?: string;
}

export interface ConvertToPdfFilesOptions {
  jobs: ConvertToPdfJob[];
  runtime?: ConversionRuntime;
  runId?: string;
  supportedExtensions?: readonly string[];
  svgToPdf?: SvgToPdfOptions;
  mermaid?: MermaidPuppeteerOptions;
  drawio?: DrawioToPdfOptions;
  ghostscriptPath?: string;
  platform?: NodeJS.Platform;
  scratchBaseCandidates?: readonly string[];
  operationName?: string;
}

export async function convertToPdfFiles(options: ConvertToPdfFilesOptions): Promise<CommittedConversionOutput[]> {
  const { runtime } = options;
  runtime?.signal?.throwIfAborted();
  validateJobs(options.jobs, options.supportedExtensions ?? DEFAULT_SUPPORTED_IMAGE_EXTENSIONS);
  await validateJobPaths(options.jobs);
  runtime?.signal?.throwIfAborted();

  await assertPreflightPassed(options.jobs, preflightOptionsFromRuntime(runtime));
  runtime?.signal?.throwIfAborted();

  const runId = options.runId ?? `${Date.now()}-${crypto.randomUUID()}`;
  const platform = options.platform ?? process.platform;
  const scratchOptions: RsvgToolScratchOptions = { platform };
  if (runtime?.outputChannel !== undefined) {
    scratchOptions.outputChannel = runtime.outputChannel;
  }
  if (options.scratchBaseCandidates !== undefined) {
    scratchOptions.scratchBaseCandidates = options.scratchBaseCandidates;
  }
  const operationName = options.operationName ?? 'convert-png-to-pdf';

  return runStagedConversionBatch({
    jobs: options.jobs,
    operationName,
    stagingOperationName: 'convert-png-to-pdf',
    runId,
    runtime: runtime ?? {},
    stage: (job, index, currentRunId, batchRuntime) =>
      stageSourceToPdf(
        job,
        index,
        currentRunId,
        batchRuntime.signal,
        options.svgToPdf,
        options.mermaid,
        options.drawio,
        scratchOptions,
        options.ghostscriptPath,
      ),
  });
}

async function stageSourceToPdf(
  job: ConvertToPdfJob,
  index: number,
  runId: string,
  signal?: AbortSignal,
  svgToPdf?: SvgToPdfOptions,
  mermaid?: MermaidPuppeteerOptions,
  drawio?: DrawioToPdfOptions,
  scratchOptions: RsvgToolScratchOptions = {},
  ghostscriptPath?: string,
): Promise<PreparedConversionOutput> {
  signal?.throwIfAborted();
  const stagedOutputPath = path.join(
    job.workspacePath,
    '.latex-graphics-helper',
    'convert-png-to-pdf',
    runId,
    `${index + 1}`,
    'result.pdf',
  );
  const stagingRootPath = path.join(job.workspacePath, '.latex-graphics-helper', 'convert-png-to-pdf', runId);

  const writeOptions: WriteSourceAsPdfOptions = {
    sourcePath: job.sourcePath,
    outputPath: stagedOutputPath,
    workspacePath: job.workspacePath,
    scratchOptions,
  };
  if (signal !== undefined) {
    writeOptions.signal = signal;
  }
  if (svgToPdf !== undefined) {
    writeOptions.svgToPdf = svgToPdf;
  }
  if (mermaid !== undefined) {
    writeOptions.mermaid = mermaid;
  }
  if (drawio !== undefined) {
    writeOptions.drawio = drawio;
  }
  if (ghostscriptPath !== undefined) {
    writeOptions.ghostscriptPath = ghostscriptPath;
  }
  await writeSourceAsPdf(writeOptions);
  signal?.throwIfAborted();
  await validateGeneratedPdf(stagedOutputPath);
  signal?.throwIfAborted();

  return {
    stagedOutputPath,
    outputPath: job.outputPath,
    workspacePath: job.workspacePath,
    stagingRootPath,
  };
}

export async function writeSourceAsPdf(options: WriteSourceAsPdfOptions): Promise<void> {
  const {
    sourcePath,
    outputPath,
    workspacePath,
    signal,
    svgToPdf,
    mermaid,
    drawio,
    scratchOptions = {},
    ghostscriptPath,
  } = options;
  const extension = path.extname(sourcePath).toLowerCase();

  if (extension === '.pdf') {
    await assertWritablePathInWorkspace(outputPath, workspacePath);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, await readFile(sourcePath));
    return;
  }

  if (isEditableDrawioImagePath(sourcePath)) {
    await writeDrawioAsPdf(sourcePath, outputPath, workspacePath, signal, drawio);
    return;
  }

  if (isMermaidPath(sourcePath)) {
    await writeMermaidAsPdf(sourcePath, outputPath, workspacePath, signal, mermaid);
    return;
  }

  if (extension === SVG_EXTENSION) {
    await writeSvgAsPdf(sourcePath, outputPath, workspacePath, signal, svgToPdf, scratchOptions);
    return;
  }

  if (extension === '.eps') {
    await writeEpsAsPdf(sourcePath, outputPath, workspacePath, signal, ghostscriptPath, scratchOptions);
    return;
  }

  await writeRasterImageAsPdf(sourcePath, outputPath, workspacePath, signal);
}

async function writeDrawioAsPdf(
  sourcePath: string,
  outputPath: string,
  workspacePath: string,
  signal?: AbortSignal,
  drawio: DrawioToPdfOptions = { drawioPath: 'drawio' },
): Promise<void> {
  signal?.throwIfAborted();
  await assertWritablePathInWorkspace(outputPath, workspacePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  signal?.throwIfAborted();

  await (drawio.runDrawio ?? executeDrawio)(
    drawio.drawioPath,
    ['-x', '-f', 'pdf', '-o', outputPath, sourcePath],
    signal,
  );
}

async function executeDrawio(executable: string, args: string[], signal?: AbortSignal): Promise<void> {
  await runExternalTool({
    toolName: 'drawio',
    executable,
    args,
    ...(signal !== undefined && { signal }),
  });
}

async function writeMermaidAsPdf(
  sourcePath: string,
  outputPath: string,
  workspacePath: string,
  signal?: AbortSignal,
  mermaid?: MermaidPuppeteerOptions,
): Promise<void> {
  signal?.throwIfAborted();
  await assertWritablePathInWorkspace(outputPath, workspacePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  signal?.throwIfAborted();

  try {
    await runMermaidCli(sourcePath, asPdfOutputPath(outputPath), {
      outputFormat: 'pdf',
      puppeteerConfig: createMermaidPuppeteerConfig(mermaid),
      quiet: true,
      ...createMermaidCliRenderOptions(mermaid),
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error instanceof Error ? error : new Error(String(error));
    }

    throw new Error(`Mermaid CLI failed: ${errorMessage(error)}`, { cause: error });
  }
}

function createMermaidPuppeteerConfig(
  options: MermaidPuppeteerOptions = { browserChannel: 'chrome', theme: 'default', backgroundColor: 'white' },
): Record<string, unknown> {
  const config: Record<string, unknown> = { headless: true };
  if (options.executablePath) {
    config.executablePath = options.executablePath;
  } else {
    config.channel = options.browserChannel;
  }
  return config;
}

function asPdfOutputPath(outputPath: string): `${string}.pdf` {
  if (!outputPath.toLowerCase().endsWith('.pdf')) {
    throw new Error(`Mermaid PDF output path must end with .pdf: ${outputPath}`);
  }

  return outputPath as unknown as `${string}.pdf`;
}

async function writeEpsAsPdf(
  sourcePath: string,
  outputPath: string,
  workspacePath: string,
  signal: AbortSignal | undefined,
  ghostscriptPath: string | undefined,
  scratchOptions: RsvgToolScratchOptions,
): Promise<void> {
  if (!ghostscriptPath) {
    throw new Error('Ghostscript is required for EPS conversion');
  }

  signal?.throwIfAborted();
  const epsStaging = path.join(path.dirname(outputPath), 'eps-staging');
  await mkdir(epsStaging, { recursive: true });
  signal?.throwIfAborted();

  const epsOptions: Parameters<typeof convertEpsToPdf>[0] = {
    epsPath: sourcePath,
    workspacePath,
    ghostscriptPath,
    stagingDirectory: epsStaging,
  };
  if (signal !== undefined) {
    epsOptions.signal = signal;
  }
  if (scratchOptions.platform !== undefined) {
    epsOptions.platform = scratchOptions.platform;
  }
  if (scratchOptions.scratchBaseCandidates !== undefined) {
    epsOptions.scratchBaseCandidates = scratchOptions.scratchBaseCandidates;
  }
  if (scratchOptions.outputChannel !== undefined) {
    epsOptions.outputChannel = scratchOptions.outputChannel;
  }

  const { pdfPath } = await convertEpsToPdf(epsOptions);

  signal?.throwIfAborted();
  await assertWritablePathInWorkspace(outputPath, workspacePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, await readFile(pdfPath));
}

async function writeRasterImageAsPdf(
  sourcePath: string,
  outputPath: string,
  workspacePath: string,
  signal?: AbortSignal,
): Promise<void> {
  signal?.throwIfAborted();
  const sourceBuffer = await readFile(sourcePath);
  signal?.throwIfAborted();
  const metadata = await sharp(sourceBuffer).metadata();
  signal?.throwIfAborted();
  const { width, height } = metadata;

  if (!width || !height) {
    throw new Error(`Could not determine image dimensions: ${sourcePath}`);
  }

  const imageBuffer = await sharp(sourceBuffer).png().toBuffer();
  signal?.throwIfAborted();
  const pdfDocument = await PDFDocument.create();
  const page = pdfDocument.addPage([width, height]);
  const embeddedImage = await pdfDocument.embedPng(imageBuffer);
  page.drawImage(embeddedImage, {
    x: 0,
    y: 0,
    width,
    height,
  });

  const pdfBytes = await pdfDocument.save();
  signal?.throwIfAborted();
  await assertWritablePathInWorkspace(outputPath, workspacePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  signal?.throwIfAborted();
  await writeFile(outputPath, pdfBytes);
}

async function writeSvgAsPdf(
  sourcePath: string,
  outputPath: string,
  workspacePath: string,
  signal?: AbortSignal,
  svgToPdf?: SvgToPdfOptions,
  scratchOptions: RsvgToolScratchOptions = {},
): Promise<void> {
  const options = svgToPdf ?? {
    engine: 'puppeteer',
    rsvgConvertPath: 'rsvg-convert',
    puppeteerBrowser: 'chrome',
    puppeteerBrowserChannel: 'chrome',
  };
  const size = await readSvgSize(sourcePath);

  signal?.throwIfAborted();
  await assertWritablePathInWorkspace(outputPath, workspacePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  signal?.throwIfAborted();

  if (options.engine === 'rsvg-convert') {
    await writeSvgAsPdfWithRsvgConvert(sourcePath, outputPath, options, scratchOptions, signal);
  } else {
    await writeSvgAsPdfWithPuppeteer(sourcePath, outputPath, size, options, signal);
  }

  signal?.throwIfAborted();
  await normalizePdfPageSize(outputPath, size.width, size.height);
}

async function readSvgSize(sourcePath: string): Promise<{ width: number; height: number }> {
  const sourceBuffer = await readFile(sourcePath);
  const metadata = await sharp(sourceBuffer).metadata();
  const { width, height } = metadata;

  if (!width || !height) {
    throw new Error(`Could not determine SVG dimensions: ${sourcePath}`);
  }

  return { width, height };
}

async function writeSvgAsPdfWithRsvgConvert(
  sourcePath: string,
  outputPath: string,
  options: SvgToPdfOptions,
  scratchOptions: RsvgToolScratchOptions,
  signal?: AbortSignal,
): Promise<void> {
  await runRsvgConvertWithAsciiScratch({
    executable: options.rsvgConvertPath,
    sourcePath,
    outputPath,
    run: options.runRsvgConvert ?? executeRsvgConvert,
    scratch: scratchOptions,
    ...(signal !== undefined && { signal }),
  });
}

async function executeRsvgConvert(executable: string, args: string[], signal?: AbortSignal): Promise<void> {
  await execFileAsync(executable, args, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    signal,
  });
}

async function writeSvgAsPdfWithPuppeteer(
  sourcePath: string,
  outputPath: string,
  size: { width: number; height: number },
  options: SvgToPdfOptions,
  signal?: AbortSignal,
): Promise<void> {
  const rawSvg = await readFile(sourcePath, 'utf8');
  const svg = rawSvg.replace(/^<\?xml[^>]*\?>/i, '').trim();
  signal?.throwIfAborted();

  let browser: Browser | undefined;

  try {
    browser = await launch(createSvgPuppeteerLaunchOptions(options));
    signal?.throwIfAborted();

    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      // The SVG is injected as inline content. No network or subframe navigation
      // is required, including requests created from foreignObject content.
      request.abort().catch(() => {});
    });
    await page.setContent(svgPageHtml(svg, size), { waitUntil: 'load' });
    signal?.throwIfAborted();
    await page.pdf({
      path: outputPath,
      width: `${size.width / 72}in`,
      height: `${size.height / 72}in`,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      printBackground: true,
      preferCSSPageSize: false,
    });
  } finally {
    await browser?.close().catch(() => {});
  }
}

function puppeteerLaunchEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  return env;
}

function svgPageHtml(svg: string, size: { width: number; height: number }): string {
  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    '<style>',
    '@page { margin: 0; }',
    `html, body { margin: 0; width: ${size.width}px; height: ${size.height}px; overflow: hidden; }`,
    'svg { display: block; width: 100%; height: 100%; }',
    '</style>',
    '</head>',
    '<body>',
    svg,
    '</body>',
    '</html>',
  ].join('');
}

async function validateGeneratedPdf(outputPath: string): Promise<void> {
  let pdfDocument: PDFDocument;

  try {
    pdfDocument = await PDFDocument.load(await readFile(outputPath));
  } catch (error) {
    throw new Error(`PDF conversion produced an unparsable PDF: ${errorMessage(error)}`, { cause: error });
  }

  if (pdfDocument.getPageCount() === 0) {
    throw new Error(`PDF conversion produced no pages: ${outputPath}`);
  }

  for (const page of pdfDocument.getPages()) {
    for (const [boxName, box] of [
      ['MediaBox', page.getMediaBox()],
      ['CropBox', page.getCropBox()],
      ['TrimBox', page.getTrimBox()],
    ] as const) {
      const values = [box.x, box.y, box.width, box.height];
      if (!values.every(Number.isFinite) || box.width <= 0 || box.height <= 0) {
        throw new Error(`PDF conversion produced invalid ${boxName} dimensions: ${outputPath}`);
      }
    }
  }
}

async function normalizePdfPageSize(outputPath: string, width: number, height: number): Promise<void> {
  const pdfDocument = await PDFDocument.load(await readFile(outputPath));
  if (pdfDocument.getPageCount() === 0) {
    throw new Error(`Generated PDF has no pages: ${outputPath}`);
  }

  const firstPage = pdfDocument.getPage(0);
  setPageSize(firstPage, width, height);

  await writeFile(outputPath, await pdfDocument.save());
}

function setPageSize(page: PDFPage, width: number, height: number): void {
  page.setMediaBox(0, 0, width, height);
  page.setCropBox(0, 0, width, height);
}

async function validateJobPaths(jobs: ConvertToPdfJob[]): Promise<void> {
  await Promise.all(
    jobs.flatMap((job) => [
      assertExistingPathInWorkspace(job.sourcePath, job.workspacePath),
      assertWritablePathInWorkspace(job.outputPath, job.workspacePath),
      assertWritablePathInWorkspace(
        path.join(job.workspacePath, '.latex-graphics-helper', 'convert-png-to-pdf'),
        job.workspacePath,
      ),
    ]),
  );
}

function validateJobs(jobs: ConvertToPdfJob[], supportedExtensions: readonly string[]): void {
  if (jobs.length === 0) {
    throw new Error('No image files were selected.');
  }

  const supportedExtensionSet = new Set(supportedExtensions.map((extension) => extension.toLowerCase()));

  for (const job of jobs) {
    if (!isSupportedSourcePath(job.sourcePath, supportedExtensionSet)) {
      throw new Error(`Unsupported image format: ${job.sourcePath}`);
    }
  }
}

function isSupportedSourcePath(sourcePath: string, supportedExtensionSet: Set<string>): boolean {
  const lowerSourcePath = sourcePath.toLowerCase();
  return [...supportedExtensionSet].some((extension) => lowerSourcePath.endsWith(extension));
}
