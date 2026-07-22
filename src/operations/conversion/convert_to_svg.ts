import { execFile } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { run as runMermaidCli } from '@mermaid-js/mermaid-cli';

import { isEditableDrawioImagePath, sourceFormatForPath } from '../../application/policy/source_format.js';
import { convertEpsToPdf } from './eps_to_pdf.js';
import { assertPreflightPassed } from '../input/input_preflight.js';
import { assertExistingPathInWorkspace, assertWritablePathInWorkspace } from '../../security/workspace_path.js';

import {
  type CommittedConversionOutput,
  type OutputConflictDecision,
  type PreparedConversionOutput,
} from '../lifecycle/commit_conversion_outputs.js';
import type { ConversionRuntime } from '../lifecycle/conversion_runtime.js';
import type { MermaidPuppeteerOptions, RunDrawio } from './convert_to_pdf.js';
import { createMermaidCliRenderOptions } from './mermaid_render_options.js';
import { runExternalTool } from '../external_tools/run_external_tool.js';
import {
  runPdftocairoWithAsciiScratch,
  type PdfToolScratchOptions,
} from '../external_tools/run_pdftocairo_with_ascii_scratch.js';
import type { LineOutputChannel } from '../external_tools/external_tool_ascii_scratch.js';
import { runStagedConversionBatch } from '../lifecycle/run_staged_conversion_batch.js';

export type { MermaidPuppeteerOptions };

const execFileAsync = promisify(execFile);

export interface ConvertToSvgJob {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
  page?: number;
}

export interface DrawioToSvgOptions {
  drawioPath: string;
  runDrawio?: RunDrawio;
}

export type RunPdfToSvg = (sourcePath: string, outputPath: string, page: number, signal?: AbortSignal) => Promise<void>;

export interface ConvertToSvgFilesOptions extends PdfToolScratchOptions {
  jobs: ConvertToSvgJob[];
  pdftocairoPath: string;
  ghostscriptPath: string;
  mermaid: MermaidPuppeteerOptions;
  drawio: DrawioToSvgOptions;
  runPdfToSvg?: RunPdfToSvg;
  runId?: string;
  resolveOutputConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  signal?: AbortSignal;
  outputChannel?: LineOutputChannel;
}

export async function convertToSvgFiles(options: ConvertToSvgFilesOptions): Promise<CommittedConversionOutput[]> {
  options.signal?.throwIfAborted();
  validateJobs(options.jobs);
  await validateJobPaths(options.jobs);
  options.signal?.throwIfAborted();

  await assertPreflightPassed(options.jobs, options.outputChannel, options.signal);
  options.signal?.throwIfAborted();

  const runId = options.runId ?? `${Date.now()}-${crypto.randomUUID()}`;
  const runtime: ConversionRuntime = {};
  if (options.signal !== undefined) {
    runtime.signal = options.signal;
  }
  if (options.resolveOutputConflicts !== undefined) {
    runtime.resolveConflicts = options.resolveOutputConflicts;
  }
  if (options.outputChannel !== undefined) {
    runtime.outputChannel = options.outputChannel;
  }

  return runStagedConversionBatch({
    jobs: options.jobs,
    operationName: 'convert-to-svg',
    runId,
    runtime,
    stage: (job, index, currentRunId, batchRuntime) =>
      stageSvgConversion(
        job,
        index,
        currentRunId,
        options.pdftocairoPath,
        options.ghostscriptPath,
        options.mermaid,
        options.drawio,
        options.runPdfToSvg,
        options,
        batchRuntime.outputChannel,
        batchRuntime.signal,
      ),
  });
}

async function stageSvgConversion(
  job: ConvertToSvgJob,
  index: number,
  runId: string,
  pdftocairoPath: string,
  ghostscriptPath: string,
  mermaid: MermaidPuppeteerOptions,
  drawio: DrawioToSvgOptions,
  runPdfToSvg: RunPdfToSvg | undefined,
  scratchOptions: PdfToolScratchOptions,
  outputChannel: LineOutputChannel | undefined,
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
    pdftocairoPath,
    ghostscriptPath,
    mermaid,
    drawio,
    runPdfToSvg,
    scratchOptions,
    outputChannel,
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
  pdftocairoPath: string,
  ghostscriptPath: string,
  mermaid: MermaidPuppeteerOptions,
  drawio: DrawioToSvgOptions,
  runPdfToSvg: RunPdfToSvg | undefined,
  scratchOptions: PdfToolScratchOptions,
  outputChannel: LineOutputChannel | undefined,
  signal?: AbortSignal,
): Promise<void> {
  const extension = path.extname(job.sourcePath).toLowerCase();

  if (isEditableDrawioImagePath(job.sourcePath)) {
    await writeDrawioAsSvg(job.sourcePath, outputPath, job.workspacePath, drawio, signal);
    return;
  }

  if (extension === '.eps') {
    await writeEpsAsSvg(
      job.sourcePath,
      outputPath,
      job.workspacePath,
      ghostscriptPath,
      pdftocairoPath,
      job.page,
      runPdfToSvg,
      scratchOptions,
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
      pdftocairoPath,
      job.page,
      runPdfToSvg,
      scratchOptions,
      outputChannel,
      signal,
    );
    return;
  }

  await writeMermaidAsSvg(job.sourcePath, outputPath, job.workspacePath, mermaid, signal);
}

async function writeEpsAsSvg(
  sourcePath: string,
  outputPath: string,
  workspacePath: string,
  ghostscriptPath: string,
  pdftocairoPath: string,
  page: number | undefined,
  runPdfToSvg: RunPdfToSvg | undefined,
  scratchOptions: PdfToolScratchOptions,
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
    ghostscriptPath,
    stagingDirectory: epsStaging,
  };
  if (signal !== undefined) {
    epsOptions.signal = signal;
  }
  if (outputChannel !== undefined) {
    epsOptions.outputChannel = outputChannel;
  }
  if (scratchOptions.scratchBaseCandidates !== undefined) {
    epsOptions.scratchBaseCandidates = scratchOptions.scratchBaseCandidates;
  }
  if (scratchOptions.platform !== undefined) {
    epsOptions.platform = scratchOptions.platform;
  }

  const { pdfPath } = await convertEpsToPdf(epsOptions);

  signal?.throwIfAborted();
  await writePdfPageAsSvg(
    pdfPath,
    outputPath,
    workspacePath,
    pdftocairoPath,
    page ?? 1,
    runPdfToSvg,
    scratchOptions,
    outputChannel,
    signal,
  );
}

async function writeDrawioAsSvg(
  sourcePath: string,
  outputPath: string,
  workspacePath: string,
  drawio: DrawioToSvgOptions,
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
  pdftocairoPath: string,
  page = 1,
  runPdfToSvg: RunPdfToSvg | undefined,
  scratchOptions: PdfToolScratchOptions,
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
      scratch: scratchOptions,
      signal,
      outputChannel,
      run: async (toolSourcePath, toolOutputPath) => {
        if (runPdfToSvg) {
          await runPdfToSvg(toolSourcePath, toolOutputPath, page, signal);
          return;
        }

        await execFileAsync(
          pdftocairoPath,
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
  mermaid: MermaidPuppeteerOptions,
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
    sourceFormatForPath(sourcePath) === 'mermaid' ||
    isEditableDrawioImagePath(sourcePath)
  );
}

function asSvgOutputPath(outputPath: string): `${string}.svg` {
  if (!outputPath.toLowerCase().endsWith('.svg')) {
    throw new Error(`SVG output path must end with .svg: ${outputPath}`);
  }

  return outputPath as unknown as `${string}.svg`;
}

function createMermaidPuppeteerConfig(options: MermaidPuppeteerOptions): Record<string, unknown> {
  const config: Record<string, unknown> = { headless: true };
  if (options.executablePath) {
    config.executablePath = options.executablePath;
  } else {
    config.channel = options.browserChannel;
  }
  return config;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    const stderr = 'stderr' in error && typeof error.stderr === 'string' ? error.stderr.trim() : '';
    return stderr ? `${error.message}\n${stderr}` : error.message;
  }

  return String(error);
}
