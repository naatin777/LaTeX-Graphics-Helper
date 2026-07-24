import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { run as runMermaidCli } from '@mermaid-js/mermaid-cli';

import { isEditableDrawioImagePath, sourceFormatForPath } from '../../application/policy/source_format.js';
import { DEFAULT_MAX_INPUT_PIXELS } from '../../config/raster_input.js';
import { convertEpsToPdf } from './eps_to_pdf.js';
import { assertPreflightPassed, preflightOptionsFromRuntime } from '../input/input_preflight.js';
import { assertExistingPathInWorkspace, assertWritablePathInWorkspace } from '../../security/workspace_path.js';
import { errorMessage } from './raster_conversion.js';
import { isAbortError } from '../../commands/shared/command_utils.js';

import {
  type CommittedConversionOutput,
  type PreparedConversionOutput,
} from '../lifecycle/commit_conversion_outputs.js';
import type { ConversionRuntime } from '../lifecycle/conversion_runtime.js';
import type { LineOutputChannel } from '../external_tools/external_tool_ascii_scratch.js';
import type { DrawioTools, MermaidTools, PdftocairoTools, RunPdfToSvg } from './tools/index.js';
import { createMermaidCliRenderOptions } from './mermaid_render_options.js';
import { runExternalTool } from '../external_tools/run_external_tool.js';
import { runPdftocairoWithAsciiScratch } from '../external_tools/run_pdftocairo_with_ascii_scratch.js';
import { runStagedConversionBatch } from '../lifecycle/run_staged_conversion_batch.js';
import { destroyRasterInput, openRasterInput } from './raster_input.js';

const execFileAsync = promisify(execFile);

export interface ConvertToSvgJob {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
  page?: number;
}

export interface ConvertToSvgFilesOptions {
  jobs: ConvertToSvgJob[];
  pdftocairoTools: PdftocairoTools;
  ghostscriptTools: { ghostscriptPath: string; platform?: NodeJS.Platform; scratchBaseCandidates?: readonly string[] };
  mermaidTools: MermaidTools;
  drawioTools: DrawioTools;
  runtime?: ConversionRuntime;
  runPdfToSvg?: RunPdfToSvg;
  runId?: string;
  maxInputPixels?: number;
}

export async function convertToSvgFiles(options: ConvertToSvgFilesOptions): Promise<CommittedConversionOutput[]> {
  const { runtime } = options;
  runtime?.signal?.throwIfAborted();
  const maxInputPixels = options.maxInputPixels ?? DEFAULT_MAX_INPUT_PIXELS;
  validateJobs(options.jobs);
  await validateJobPaths(options.jobs);
  runtime?.signal?.throwIfAborted();

  await assertPreflightPassed(options.jobs, {
    ...preflightOptionsFromRuntime(runtime),
    maxInputPixels,
  });
  runtime?.signal?.throwIfAborted();

  const runId = options.runId ?? `${Date.now()}-${crypto.randomUUID()}`;

  return runStagedConversionBatch({
    jobs: options.jobs,
    operationName: 'convert-to-svg',
    runId,
    runtime: runtime ?? {},
    stage: (job, index, currentRunId, batchRuntime) =>
      stageSvgConversion(
        job,
        index,
        currentRunId,
        options.pdftocairoTools,
        options.ghostscriptTools,
        options.mermaidTools,
        options.drawioTools,
        options.runPdfToSvg,
        batchRuntime.outputChannel,
        maxInputPixels,
        batchRuntime.signal,
      ),
  });
}

async function stageSvgConversion(
  job: ConvertToSvgJob,
  index: number,
  runId: string,
  pdftocairoTools: PdftocairoTools,
  ghostscriptTools: { ghostscriptPath: string; platform?: NodeJS.Platform; scratchBaseCandidates?: readonly string[] },
  mermaidTools: MermaidTools,
  drawioTools: DrawioTools,
  runPdfToSvg: RunPdfToSvg | undefined,
  outputChannel: LineOutputChannel | undefined,
  maxInputPixels: number,
  signal?: AbortSignal,
): Promise<PreparedConversionOutput> {
  signal?.throwIfAborted();
  const stageDirectory = path.join(
    job.workspacePath,
    '.latex-graphics-helper',
    'convert-to-svg',
    runId,
    `${index + 1}`,
  );
  const stagedOutputPath = path.join(stageDirectory, 'result.svg');

  await writeSourceAsSvg(
    job,
    stagedOutputPath,
    pdftocairoTools,
    ghostscriptTools,
    mermaidTools,
    drawioTools,
    runPdfToSvg,
    outputChannel,
    maxInputPixels,
    signal,
  );
  signal?.throwIfAborted();
  await validateGeneratedSvg(stagedOutputPath);
  signal?.throwIfAborted();

  return {
    stagedOutputPath,
    outputPath: job.outputPath,
    workspacePath: job.workspacePath,
    stagingRootPath: path.join(job.workspacePath, '.latex-graphics-helper', 'convert-to-svg', runId),
  };
}

async function writeSourceAsSvg(
  job: ConvertToSvgJob,
  outputPath: string,
  pdftocairoTools: PdftocairoTools,
  ghostscriptTools: { ghostscriptPath: string; platform?: NodeJS.Platform; scratchBaseCandidates?: readonly string[] },
  mermaidTools: MermaidTools,
  drawioTools: DrawioTools,
  runPdfToSvg: RunPdfToSvg | undefined,
  outputChannel: LineOutputChannel | undefined,
  maxInputPixels: number,
  signal?: AbortSignal,
): Promise<void> {
  const extension = path.extname(job.sourcePath).toLowerCase();

  if (isEditableDrawioImagePath(job.sourcePath)) {
    await writeDrawioAsSvg(job.sourcePath, outputPath, job.workspacePath, drawioTools, signal);
    return;
  }

  if (extension === '.eps') {
    await writeEpsAsSvg(
      job.sourcePath,
      outputPath,
      job.workspacePath,
      ghostscriptTools,
      pdftocairoTools,
      job.page,
      runPdfToSvg,
      outputChannel,
      signal,
    );
    return;
  }

  if (extension === '.pdf') {
    await writePdfPageAsSvg(
      job.sourcePath,
      outputPath,
      job.workspacePath,
      pdftocairoTools,
      job.page,
      runPdfToSvg,
      outputChannel,
      signal,
    );
    return;
  }

  if (sourceFormatForPath(job.sourcePath) === 'raw') {
    await writeRawAsSvg(job.sourcePath, outputPath, job.workspacePath, signal, maxInputPixels);
    return;
  }

  await writeMermaidAsSvg(job.sourcePath, outputPath, job.workspacePath, mermaidTools, signal);
}

async function writeEpsAsSvg(
  sourcePath: string,
  outputPath: string,
  workspacePath: string,
  ghostscriptTools: { ghostscriptPath: string; platform?: NodeJS.Platform; scratchBaseCandidates?: readonly string[] },
  pdftocairoTools: PdftocairoTools,
  page: number | undefined,
  runPdfToSvg: RunPdfToSvg | undefined,
  outputChannel: LineOutputChannel | undefined,
  signal?: AbortSignal,
): Promise<void> {
  signal?.throwIfAborted();
  const epsStaging = path.join(path.dirname(outputPath), 'eps-staging');
  await mkdir(epsStaging, { recursive: true });
  signal?.throwIfAborted();

  const epsOptions: Parameters<typeof convertEpsToPdf>[0] = {
    epsPath: sourcePath,
    workspacePath,
    ghostscriptPath: ghostscriptTools.ghostscriptPath,
    stagingDirectory: epsStaging,
  };
  if (signal !== undefined) {
    epsOptions.signal = signal;
  }
  if (outputChannel !== undefined) {
    epsOptions.outputChannel = outputChannel;
  }
  if (ghostscriptTools.scratchBaseCandidates !== undefined) {
    epsOptions.scratchBaseCandidates = ghostscriptTools.scratchBaseCandidates;
  }
  if (ghostscriptTools.platform !== undefined) {
    epsOptions.platform = ghostscriptTools.platform;
  }

  const { pdfPath } = await convertEpsToPdf(epsOptions);

  signal?.throwIfAborted();
  await writePdfPageAsSvg(
    pdfPath,
    outputPath,
    workspacePath,
    pdftocairoTools,
    page ?? 1,
    runPdfToSvg,
    outputChannel,
    signal,
  );
}

async function writeDrawioAsSvg(
  sourcePath: string,
  outputPath: string,
  workspacePath: string,
  drawio: DrawioTools,
  signal?: AbortSignal,
): Promise<void> {
  signal?.throwIfAborted();
  await assertWritablePathInWorkspace(outputPath, workspacePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  signal?.throwIfAborted();

  try {
    await (drawio.runDrawio ?? executeDrawio)(
      drawio.drawioPath,
      ['-x', '-f', 'svg', '-o', outputPath, sourcePath],
      signal,
    );
  } catch (error) {
    if (isAbortError(error)) {
      throw error instanceof Error ? error : new Error(String(error));
    }

    throw new Error(`Draw.io CLI failed: ${errorMessage(error)}`, { cause: error });
  }
}

async function writePdfPageAsSvg(
  sourcePath: string,
  outputPath: string,
  workspacePath: string,
  pdftocairoTools: PdftocairoTools,
  page = 1,
  runPdfToSvg: RunPdfToSvg | undefined,
  outputChannel: LineOutputChannel | undefined,
  signal?: AbortSignal,
): Promise<void> {
  signal?.throwIfAborted();
  await assertWritablePathInWorkspace(outputPath, workspacePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  signal?.throwIfAborted();

  try {
    await runPdftocairoWithAsciiScratch({
      sourcePath,
      outputPath,
      scratchOutputFileName: 'output.svg',
      scratch: pdftocairoTools,
      signal,
      outputChannel,
      run: async (toolSourcePath, toolOutputPath) => {
        if (runPdfToSvg) {
          await runPdfToSvg(toolSourcePath, toolOutputPath, page, signal);
          return;
        }

        await execFileAsync(
          pdftocairoTools.pdftocairoPath,
          ['-svg', '-f', String(page), '-l', String(page), toolSourcePath, toolOutputPath],
          {
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024,
            signal,
          },
        );
      },
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error instanceof Error ? error : new Error(String(error));
    }

    throw new Error(`pdftocairo failed: ${errorMessage(error)}`, { cause: error });
  }
}

async function writeMermaidAsSvg(
  sourcePath: string,
  outputPath: string,
  workspacePath: string,
  mermaid: MermaidTools,
  signal?: AbortSignal,
): Promise<void> {
  signal?.throwIfAborted();
  await assertWritablePathInWorkspace(outputPath, workspacePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  signal?.throwIfAborted();

  try {
    await runMermaidCli(sourcePath, asSvgOutputPath(outputPath), {
      outputFormat: 'svg',
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

async function executeDrawio(executable: string, args: string[], signal?: AbortSignal): Promise<void> {
  await runExternalTool({
    toolName: 'drawio',
    executable,
    args,
    ...(signal !== undefined && { signal }),
  });
}

async function validateGeneratedSvg(outputPath: string): Promise<void> {
  const content = (await readFile(outputPath, 'utf8')).trim();

  if (content.length === 0) {
    throw new Error(`SVG conversion produced empty output: ${outputPath}`);
  }

  if (!/<svg(?:\s|>)/iu.test(content)) {
    throw new Error(`SVG conversion produced non-SVG output: ${outputPath}`);
  }
}

async function validateJobPaths(jobs: ConvertToSvgJob[]): Promise<void> {
  await Promise.all(
    jobs.flatMap((job) => [
      assertExistingPathInWorkspace(job.sourcePath, job.workspacePath),
      assertWritablePathInWorkspace(job.outputPath, job.workspacePath),
      assertWritablePathInWorkspace(
        path.join(job.workspacePath, '.latex-graphics-helper', 'convert-to-svg'),
        job.workspacePath,
      ),
    ]),
  );
}

function validateJobs(jobs: ConvertToSvgJob[]): void {
  if (jobs.length === 0) {
    throw new Error('No files were selected.');
  }

  for (const job of jobs) {
    if (!isSupportedSourcePath(job.sourcePath)) {
      throw new Error(`Unsupported input for SVG conversion: ${job.sourcePath}`);
    }
  }
}

function isSupportedSourcePath(sourcePath: string): boolean {
  const extension = path.extname(sourcePath).toLowerCase();

  return (
    extension === '.pdf' ||
    extension === '.eps' ||
    sourceFormatForPath(sourcePath) === 'raw' ||
    sourceFormatForPath(sourcePath) === 'mermaid' ||
    isEditableDrawioImagePath(sourcePath)
  );
}

async function writeRawAsSvg(
  sourcePath: string,
  outputPath: string,
  workspacePath: string,
  signal?: AbortSignal,
  maxInputPixels = DEFAULT_MAX_INPUT_PIXELS,
): Promise<void> {
  signal?.throwIfAborted();
  const image = openRasterInput(sourcePath, maxInputPixels);
  try {
    const [metadata, png] = await Promise.all([image.metadata(), image.png().toBuffer()]);
    if (!metadata.width || !metadata.height) {
      throw new Error(`Could not determine image dimensions: ${sourcePath}`);
    }
    await assertWritablePathInWorkspace(outputPath, workspacePath);
    await mkdir(path.dirname(outputPath), { recursive: true });
    const dataUri = `data:image/png;base64,${png.toString('base64')}`;
    await writeFile(
      outputPath,
      `<svg xmlns="http://www.w3.org/2000/svg" width="${metadata.width}" height="${metadata.height}"><image href="${dataUri}" width="${metadata.width}" height="${metadata.height}"/></svg>`,
    );
  } finally {
    await destroyRasterInput(image);
  }
}

function asSvgOutputPath(outputPath: string): `${string}.svg` {
  if (!outputPath.toLowerCase().endsWith('.svg')) {
    throw new Error(`SVG output path must end with .svg: ${outputPath}`);
  }

  return outputPath as unknown as `${string}.svg`;
}

function createMermaidPuppeteerConfig(options: MermaidTools): Record<string, unknown> {
  const config: Record<string, unknown> = { headless: true };
  if (options.executablePath) {
    config.executablePath = options.executablePath;
  } else {
    config.channel = options.browserChannel;
  }
  return config;
}
