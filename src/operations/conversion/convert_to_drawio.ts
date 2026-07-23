import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { run as runMermaidCli } from '@mermaid-js/mermaid-cli';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

import { isMermaidPath, sourceFormatForPath } from '../../application/policy/source_format.js';
import { DEFAULT_MAX_INPUT_PIXELS } from '../../config/raster_input.js';
import { assertPreflightPassed, preflightOptionsFromRuntime } from '../input/input_preflight.js';
import type { ConversionRuntime } from '../lifecycle/conversion_runtime.js';
import type { CommittedConversionOutput, PreparedConversionOutput } from '../lifecycle/commit_conversion_outputs.js';
import { runStagedConversionBatch } from '../lifecycle/run_staged_conversion_batch.js';
import { assertExistingPathInWorkspace, assertWritablePathInWorkspace } from '../../security/workspace_path.js';
import { createMermaidCliRenderOptions } from './mermaid_render_options.js';
import { openRasterInput } from './raster_input.js';
import type { MermaidPuppeteerOptions } from './convert_to_pdf.js';
import { runExternalTool } from '../external_tools/run_external_tool.js';
import type { ChromeReleaseChannel } from 'puppeteer-core';

const execFileAsync = promisify(execFile);
export interface DrawioInput {
  sourcePath: string;
  pageName?: string;
}

export interface ConvertToDrawioJob {
  inputs: DrawioInput[];
  outputPath: string;
  workspacePath: string;
}

export interface ConvertToDrawioOptions {
  jobs: ConvertToDrawioJob[];
  pdftocairoPath?: string;
  ghostscriptPath: string;
  mermaid?: MermaidPuppeteerOptions;
  runtime?: ConversionRuntime;
  runId?: string;
  maxInputPixels?: number;
  runPdfToSvg?: RunPdfToSvg;
  runGhostscript?: RunGhostscript;
  runMermaid?: RunMermaid;
  drawioPath: string;
  runDrawio?: RunDrawio;
}

export type RunPdfToSvg = (sourcePath: string, outputPath: string, page: number, signal?: AbortSignal) => Promise<void>;
export type RunGhostscript = (executable: string, args: string[], signal?: AbortSignal) => Promise<void>;
export type RunMermaid = (sourcePath: string, outputPath: string, signal?: AbortSignal) => Promise<void>;
export type RunDrawio = (
  executable: string,
  args: string[],
  signal?: AbortSignal,
  outputChannel?: ConversionRuntime['outputChannel'],
) => Promise<void>;

export async function convertToDrawioFiles(options: ConvertToDrawioOptions): Promise<CommittedConversionOutput[]> {
  if (options.jobs.length === 0) {
    throw new Error('No files were selected.');
  }
  for (const job of options.jobs) {
    if (job.inputs.length === 0) {
      throw new Error('No Draw.io inputs were selected.');
    }
    await Promise.all([
      ...job.inputs.map((input) => assertExistingPathInWorkspace(input.sourcePath, job.workspacePath)),
      assertWritablePathInWorkspace(job.outputPath, job.workspacePath),
      assertWritablePathInWorkspace(
        path.join(job.workspacePath, '.latex-graphics-helper', 'convert-to-drawio'),
        job.workspacePath,
      ),
    ]);
  }

  await assertPreflightPassed(
    options.jobs.flatMap((job) => job.inputs),
    {
      ...preflightOptionsFromRuntime(options.runtime),
      maxInputPixels: options.maxInputPixels ?? DEFAULT_MAX_INPUT_PIXELS,
    },
  );
  const runId = options.runId ?? `${Date.now()}-${crypto.randomUUID()}`;

  return runStagedConversionBatch({
    jobs: options.jobs,
    operationName: 'convert-to-drawio',
    runId,
    runtime: options.runtime ?? {},
    stage: (job, _index, currentRunId, runtime) => stageDrawio(job, currentRunId, runtime, options),
  });
}

async function stageDrawio(
  job: ConvertToDrawioJob,
  runId: string,
  runtime: ConversionRuntime,
  options: ConvertToDrawioOptions,
): Promise<PreparedConversionOutput> {
  const stagingRootPath = path.join(job.workspacePath, '.latex-graphics-helper', 'convert-to-drawio', runId);
  const stageDirectory = path.join(stagingRootPath, 'inputs');
  const stagedOutputPath = path.join(stagingRootPath, `result${drawioExtension(job.outputPath)}`);
  await mkdir(stageDirectory, { recursive: true });
  const pages: DrawioPage[] = [];

  for (const [inputIndex, input] of job.inputs.entries()) {
    runtime.signal?.throwIfAborted();
    const extension = path.extname(input.sourcePath).toLowerCase();
    if (extension === '.pdf') {
      const pdf = await PDFDocument.load(await readFile(input.sourcePath));
      if (pdf.getPageCount() === 0) {
        throw new Error(`PDF has no pages: ${input.sourcePath}`);
      }
      for (let page = 1; page <= pdf.getPageCount(); page += 1) {
        const svgPath = path.join(stageDirectory, `${inputIndex}-${page}.svg`);
        await (
          options.runPdfToSvg ??
          ((source, output, currentPage, signal) =>
            executePdfToSvg(options.pdftocairoPath ?? 'pdftocairo', source, output, currentPage, signal))
        )(input.sourcePath, svgPath, page, runtime.signal);
        pages.push(await svgPage(svgPath, input, page));
      }
    } else if (extension === '.eps') {
      const pngPath = path.join(stageDirectory, `${inputIndex}.png`);
      await (options.runGhostscript ?? executeGhostscript)(
        options.ghostscriptPath,
        [
          '-dSAFER',
          '-dNOPAUSE',
          '-dBATCH',
          '-dEPSCrop',
          '-sDEVICE=pngalpha',
          '-r144',
          `-sOutputFile=${pngPath}`,
          input.sourcePath,
        ],
        runtime.signal,
      );
      pages.push(await rasterPage(pngPath, input, options.maxInputPixels ?? DEFAULT_MAX_INPUT_PIXELS));
    } else if (extension === '.svg') {
      pages.push(await svgPage(input.sourcePath, input));
    } else if (isMermaidPath(input.sourcePath)) {
      const svgPath = path.join(stageDirectory, `${inputIndex}.svg`);
      await (
        options.runMermaid ?? ((source, output, signal) => executeMermaid(source, output, signal, options.mermaid))
      )(input.sourcePath, svgPath, runtime.signal);
      pages.push(await svgPage(svgPath, input));
    } else {
      pages.push(await rasterPage(input.sourcePath, input, options.maxInputPixels ?? DEFAULT_MAX_INPUT_PIXELS));
    }
  }

  const xml = createDrawioXml(pages);
  const xmlPath = path.join(stagingRootPath, 'source.drawio');
  await writeFile(xmlPath, xml);
  if (drawioExtension(job.outputPath) === '.drawio') {
    await writeFile(stagedOutputPath, xml);
  } else {
    await exportEditableDrawioImage({
      xmlPath,
      outputPath: stagedOutputPath,
      workspacePath: job.workspacePath,
      format: drawioExtension(job.outputPath).slice(1),
      drawioPath: options.drawioPath,
      ...(options.runDrawio !== undefined && { runDrawio: options.runDrawio }),
      runtime,
    });
  }
  await assertExistingPathInWorkspace(stagedOutputPath, job.workspacePath);
  return { stagedOutputPath, outputPath: job.outputPath, workspacePath: job.workspacePath, stagingRootPath };
}

function drawioExtension(outputPath: string): string {
  const lowerPath = outputPath.toLowerCase();
  if (lowerPath.endsWith('.drawio.png') || lowerPath.endsWith('.dio.png')) {
    return '.png';
  }
  if (lowerPath.endsWith('.drawio.svg') || lowerPath.endsWith('.dio.svg')) {
    return '.svg';
  }
  return '.drawio';
}

async function exportEditableDrawioImage(options: {
  xmlPath: string;
  outputPath: string;
  workspacePath: string;
  format: string;
  drawioPath: string;
  runDrawio?: RunDrawio;
  runtime: ConversionRuntime;
}): Promise<void> {
  const args = [
    '--export',
    '--format',
    options.format,
    '--output',
    options.outputPath,
    '--embed-diagram',
    options.xmlPath,
  ];
  await (options.runDrawio ?? executeDrawio)(
    options.drawioPath,
    args,
    options.runtime.signal,
    options.runtime.outputChannel,
  );
  await assertExistingPathInWorkspace(options.outputPath, options.workspacePath);
}

export interface DrawioPage {
  name: string;
  dataUri: string;
  width: number;
  height: number;
}

async function rasterPage(sourcePath: string, input: DrawioInput, maxInputPixels: number): Promise<DrawioPage> {
  const isRaw = sourceFormatForPath(sourcePath) === 'raw';
  const image = isRaw ? openRasterInput(sourcePath, maxInputPixels) : sharp(sourcePath);
  try {
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error(`Could not determine image dimensions: ${sourcePath}`);
    }
    const dataUri = isRaw
      ? `data:image/png;base64,${(await image.png().toBuffer()).toString('base64')}`
      : `data:${mimeFor(sourcePath)};base64,${(await readFile(sourcePath)).toString('base64')}`;
    return {
      name: input.pageName ?? path.basename(sourcePath),
      dataUri,
      width: metadata.width,
      height: metadata.height,
    };
  } finally {
    if (isRaw) {
      image.destroy();
    }
  }
}

async function svgPage(sourcePath: string, input: DrawioInput, page?: number): Promise<DrawioPage> {
  const source = await readFile(sourcePath, 'utf8');
  const { width, height } = parseSvgSize(source);
  return {
    name: input.pageName ?? `${path.basename(input.sourcePath)}${page === undefined ? '' : `-${page}`}`,
    dataUri: `data:image/svg+xml;base64,${Buffer.from(source).toString('base64')}`,
    width,
    height,
  };
}

export function parseSvgSize(source: string): { width: number; height: number } {
  const tag = source.match(/<svg\b[^>]*>/iu)?.[0] ?? '';
  const width = cssNumber(tag.match(/\bwidth\s*=\s*["']([^"']+)/iu)?.[1]);
  const height = cssNumber(tag.match(/\bheight\s*=\s*["']([^"']+)/iu)?.[1]);
  const viewBox = tag.match(/\bviewBox\s*=\s*["']\s*[-+\d.e]+\s+[-+\d.e]+\s+([-+\d.e]+)\s+([-+\d.e]+)/iu);
  const resolvedWidth = width ?? (viewBox?.[1] ? Number(viewBox[1]) : undefined);
  const resolvedHeight = height ?? (viewBox?.[2] ? Number(viewBox[2]) : undefined);
  if (!resolvedWidth || !resolvedHeight || !Number.isFinite(resolvedWidth) || !Number.isFinite(resolvedHeight)) {
    throw new Error('SVG has no usable dimensions.');
  }
  return { width: resolvedWidth, height: resolvedHeight };
}

function cssNumber(value: string | undefined): number | undefined {
  const number = value ? Number.parseFloat(value) : Number.NaN;
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

export function createDrawioXml(pages: DrawioPage[]): string {
  const used = new Set<string>();
  const diagrams = pages.map((page, index) => {
    const name = uniquePageName(page.name, used);
    const id = `page-${index + 1}`;
    const cellId = `image-${index + 1}`;
    const value = escapeXml(page.dataUri);
    return `<diagram id="${id}" name="${escapeXml(name)}"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="${cellId}" style="shape=image;image=${value};imageAspect=0;" vertex="1" parent="1"><mxGeometry width="${page.width}" height="${page.height}" as="geometry"/></mxCell></root></mxGraphModel></diagram>`;
  });
  return `<mxfile host="app.diagrams.net">${diagrams.join('')}</mxfile>`;
}

function uniquePageName(value: string, used: Set<string>): string {
  const base = value.replace(/[\\/:*?"<>|]/g, '_').trim() || 'Page';
  let candidate = base;
  for (let suffix = 2; used.has(candidate.toLowerCase()); suffix += 1) {
    candidate = `${base}-${suffix}`;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function mimeFor(sourcePath: string): string {
  switch (sourceFormatForPath(sourcePath)) {
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'avif':
      return 'image/avif';
    case 'gif':
      return 'image/gif';
    case 'tiff':
      return 'image/tiff';
    case 'png':
    case 'raw':
    case 'drawio':
    case 'editable-drawio-png':
    case 'editable-drawio-svg':
    case 'eps':
    case 'mermaid':
    case 'pdf':
    case 'svg':
    case undefined:
      return 'image/png';
  }
}

async function executePdfToSvg(
  executable: string,
  sourcePath: string,
  outputPath: string,
  page: number,
  signal?: AbortSignal,
): Promise<void> {
  await execFileAsync(executable, ['-svg', '-f', String(page), '-l', String(page), sourcePath, outputPath], { signal });
}

async function executeDrawio(
  executable: string,
  args: string[],
  signal?: AbortSignal,
  outputChannel?: ConversionRuntime['outputChannel'],
): Promise<void> {
  const toolOptions: Parameters<typeof runExternalTool>[0] = { toolName: 'drawio' as const, executable, args };
  if (signal !== undefined) {
    toolOptions.signal = signal;
  }
  if (outputChannel !== undefined) {
    toolOptions.outputChannel = outputChannel;
  }
  await runExternalTool(toolOptions);
}

async function executeGhostscript(executable: string, args: string[], signal?: AbortSignal): Promise<void> {
  await runExternalTool({ toolName: 'Ghostscript', executable, args, ...(signal !== undefined && { signal }) });
}

async function executeMermaid(
  sourcePath: string,
  outputPath: string,
  signal: AbortSignal | undefined,
  options?: MermaidPuppeteerOptions,
): Promise<void> {
  signal?.throwIfAborted();
  await runMermaidCli(sourcePath as `${string}.mmd`, outputPath as `${string}.svg`, {
    outputFormat: 'svg',
    quiet: true,
    puppeteerConfig: {
      headless: true,
      channel: (options?.browserChannel ?? 'chrome') as ChromeReleaseChannel,
      ...(options?.executablePath ? { executablePath: options.executablePath } : {}),
    },
    ...(options ? createMermaidCliRenderOptions(options) : {}),
  });
}
