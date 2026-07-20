import { execFile } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { run as runMermaidCli } from '@mermaid-js/mermaid-cli';
import sharp from 'sharp';

import { isEditableDrawioImagePath, isMermaidPath, isSupportedImageInputPath } from '../application/source_format.js';
import { assertExistingPathInWorkspace, assertWritablePathInWorkspace } from '../security/workspace_path.js';

import {
  type CommittedConversionOutput,
  type OutputConflictDecision,
  type PreparedConversionOutput,
} from './commit_conversion_outputs.js';
import type { ConversionRuntime } from './conversion_runtime.js';
import type { MermaidPuppeteerOptions, RunDrawio } from './convert_png_to_pdf.js';
import { runExternalTool } from './run_external_tool.js';
import { runPdftocairoWithAsciiScratch, type PdfToolScratchOptions } from './run_pdftocairo_with_ascii_scratch.js';
import { runStagedConversionBatch } from './run_staged_conversion_batch.js';
import { defaultSourceInputOptions, prepareSourceForRasterOutput, type SourceInputOptions } from './source_input.js';

const execFileAsync = promisify(execFile);

export interface ConvertToPngJob {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
  page?: number;
}

export interface DrawioToPngOptions {
  drawioPath: string;
  runDrawio?: RunDrawio;
}

export type RunPdfToPng = (sourcePath: string, outputPath: string, page: number, signal?: AbortSignal) => Promise<void>;

export interface ConvertToPngFilesOptions extends PdfToolScratchOptions {
  jobs: ConvertToPngJob[];
  pdftocairoPath: string;
  mermaid: MermaidPuppeteerOptions;
  drawio: DrawioToPngOptions;
  sourceInput?: SourceInputOptions;
  runPdfToPng?: RunPdfToPng;
  runId?: string;
  resolveOutputConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  signal?: AbortSignal;
}

interface PngStageTools {
  pdftocairoPath: string;
  mermaid: MermaidPuppeteerOptions;
  drawio: DrawioToPngOptions;
  sourceInput: SourceInputOptions;
  runPdfToPng?: RunPdfToPng;
}

interface PngStageContext {
  runId: string;
  runtime: Pick<ConversionRuntime, 'signal'>;
  tools: PngStageTools;
  scratch: PdfToolScratchOptions;
}

interface PngStagePaths {
  stageDirectory: string;
  stagedOutputPath: string;
  stagingRootPath: string;
}

interface PngRenderRequest {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
  page?: number;
}

export async function convertToPngFiles(options: ConvertToPngFilesOptions): Promise<CommittedConversionOutput[]> {
  options.signal?.throwIfAborted();
  validateJobs(options.jobs);
  await validateJobPaths(options.jobs);
  options.signal?.throwIfAborted();

  const runId = options.runId ?? `${Date.now()}-${crypto.randomUUID()}`;
  const runtime: ConversionRuntime = {
    ...(options.signal !== undefined && { signal: options.signal }),
    ...(options.resolveOutputConflicts !== undefined && {
      resolveConflicts: options.resolveOutputConflicts,
    }),
    ...(options.outputChannel !== undefined && { outputChannel: options.outputChannel }),
  };
  const tools: PngStageTools = {
    pdftocairoPath: options.pdftocairoPath,
    mermaid: options.mermaid,
    drawio: options.drawio,
    sourceInput: options.sourceInput ?? defaultSourceInputOptions(options.platform),
    ...(options.runPdfToPng !== undefined && { runPdfToPng: options.runPdfToPng }),
  };
  const scratch: PdfToolScratchOptions = {
    ...(options.platform !== undefined && { platform: options.platform }),
    ...(options.scratchBaseCandidates !== undefined && {
      scratchBaseCandidates: options.scratchBaseCandidates,
    }),
    ...(options.outputChannel !== undefined && { outputChannel: options.outputChannel }),
  };
  return runStagedConversionBatch({
    jobs: options.jobs,
    operationName: 'convert-to-png',
    runId,
    runtime,
    stage: (job, index, stageRunId, stageRuntime) =>
      stagePngConversion(job, index, {
        runId: stageRunId,
        runtime: {
          ...(stageRuntime.signal !== undefined && { signal: stageRuntime.signal }),
        },
        tools,
        scratch,
      }),
  });
}

async function stagePngConversion(
  job: ConvertToPngJob,
  index: number,
  context: PngStageContext,
): Promise<PreparedConversionOutput> {
  context.runtime.signal?.throwIfAborted();
  const paths: PngStagePaths = {
    stageDirectory: path.join(
      job.workspacePath,
      '.latex-graphics-helper',
      'convert-to-png',
      context.runId,
      `${index + 1}`,
    ),
    stagedOutputPath: path.join(
      job.workspacePath,
      '.latex-graphics-helper',
      'convert-to-png',
      context.runId,
      `${index + 1}`,
      'result.png',
    ),
    stagingRootPath: path.join(job.workspacePath, '.latex-graphics-helper', 'convert-to-png', context.runId),
  };

  await writeSourceAsPng(job, paths, context);
  context.runtime.signal?.throwIfAborted();

  return {
    stagedOutputPath: paths.stagedOutputPath,
    outputPath: job.outputPath,
    workspacePath: job.workspacePath,
    stagingRootPath: paths.stagingRootPath,
  };
}

async function writeSourceAsPng(job: ConvertToPngJob, paths: PngStagePaths, context: PngStageContext): Promise<void> {
  const sourcePath = await prepareSourceForRasterOutput({
    sourcePath: job.sourcePath,
    stageDirectory: paths.stageDirectory,
    workspacePath: job.workspacePath,
    context: {
      sourceInput: context.tools.sourceInput,
      scratch: context.scratch,
      signal: context.runtime.signal,
    },
  });
  const extension = path.extname(sourcePath).toLowerCase();

  if (isEditableDrawioImagePath(sourcePath)) {
    await writeDrawioAsPng(job, paths, context);
    return;
  }

  const request: PngRenderRequest = {
    sourcePath,
    outputPath: paths.stagedOutputPath,
    workspacePath: job.workspacePath,
    ...(job.page !== undefined && { page: job.page }),
  };

  if (extension === '.pdf') {
    await writePdfPageAsPng(request, context);
    return;
  }

  if (isMermaidPath(sourcePath)) {
    await writeMermaidAsPng(request, context);
    return;
  }

  await writeImageAsPng(request, context);
}

async function writeDrawioAsPng(job: ConvertToPngJob, paths: PngStagePaths, context: PngStageContext): Promise<void> {
  context.runtime.signal?.throwIfAborted();
  const pdfPath = path.join(paths.stageDirectory, 'drawio.pdf');
  await assertWritablePathInWorkspace(pdfPath, job.workspacePath);
  await mkdir(path.dirname(pdfPath), { recursive: true });
  context.runtime.signal?.throwIfAborted();

  await (context.tools.drawio.runDrawio ?? executeDrawio)(
    context.tools.drawio.drawioPath,
    ['-x', '-f', 'pdf', '-o', pdfPath, job.sourcePath],
    context.runtime.signal,
  );
  await writePdfPageAsPng(
    {
      sourcePath: pdfPath,
      outputPath: paths.stagedOutputPath,
      workspacePath: job.workspacePath,
      page: job.page ?? 1,
    },
    context,
  );
}

async function writePdfPageAsPng(request: PngRenderRequest, context: PngStageContext): Promise<void> {
  context.runtime.signal?.throwIfAborted();
  await assertWritablePathInWorkspace(request.outputPath, request.workspacePath);
  await mkdir(path.dirname(request.outputPath), { recursive: true });
  context.runtime.signal?.throwIfAborted();

  await runPdftocairoWithAsciiScratch({
    sourcePath: request.sourcePath,
    outputPath: request.outputPath,
    scratchOutputFileName: 'output.png',
    scratch: context.scratch,
    ...(context.runtime.signal !== undefined && { signal: context.runtime.signal }),
    run: async (toolSourcePath, toolOutputPath) => {
      if (context.tools.runPdfToPng) {
        await context.tools.runPdfToPng(toolSourcePath, toolOutputPath, request.page ?? 1, context.runtime.signal);
        return;
      }

      const outputPrefix = toolOutputPath.slice(0, -path.extname(toolOutputPath).length);
      await execFileAsync(
        context.tools.pdftocairoPath,
        [
          '-png',
          '-singlefile',
          '-f',
          String(request.page ?? 1),
          '-l',
          String(request.page ?? 1),
          toolSourcePath,
          outputPrefix,
        ],
        {
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024,
          signal: context.runtime.signal,
        },
      );
    },
  });
}

async function writeMermaidAsPng(request: PngRenderRequest, context: PngStageContext): Promise<void> {
  context.runtime.signal?.throwIfAborted();
  await assertWritablePathInWorkspace(request.outputPath, request.workspacePath);
  await mkdir(path.dirname(request.outputPath), { recursive: true });
  context.runtime.signal?.throwIfAborted();

  try {
    await runMermaidCli(request.sourcePath, asPngOutputPath(request.outputPath), {
      outputFormat: 'png',
      puppeteerConfig: createMermaidPuppeteerConfig(context.tools.mermaid),
      quiet: true,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new Error(`Mermaid CLI failed: ${errorMessage(error)}`, { cause: error });
  }
}

async function writeImageAsPng(request: PngRenderRequest, context: PngStageContext): Promise<void> {
  context.runtime.signal?.throwIfAborted();
  await assertWritablePathInWorkspace(request.outputPath, request.workspacePath);
  await mkdir(path.dirname(request.outputPath), { recursive: true });
  const sourceBuffer = await readFile(request.sourcePath);
  context.runtime.signal?.throwIfAborted();
  await sharp(sourceBuffer).png().toFile(request.outputPath);
}

async function executeDrawio(executable: string, args: string[], signal?: AbortSignal): Promise<void> {
  await runExternalTool({
    toolName: 'drawio',
    executable,
    args,
    ...(signal !== undefined && { signal }),
  });
}

async function validateJobPaths(jobs: ConvertToPngJob[]): Promise<void> {
  await Promise.all(
    jobs.flatMap((job) => [
      assertExistingPathInWorkspace(job.sourcePath, job.workspacePath),
      assertWritablePathInWorkspace(job.outputPath, job.workspacePath),
      assertWritablePathInWorkspace(
        path.join(job.workspacePath, '.latex-graphics-helper', 'convert-to-png'),
        job.workspacePath,
      ),
    ]),
  );
}

function validateJobs(jobs: ConvertToPngJob[]): void {
  if (jobs.length === 0) {
    throw new Error('No files were selected.');
  }

  for (const job of jobs) {
    if (!isSupportedSourcePath(job.sourcePath)) {
      throw new Error(`Unsupported input for PNG conversion: ${job.sourcePath}`);
    }
  }
}

function isSupportedSourcePath(sourcePath: string): boolean {
  const extension = path.extname(sourcePath).toLowerCase();

  return (
    extension === '.pdf' ||
    extension === '.svg' ||
    isMermaidPath(sourcePath) ||
    isSupportedImageInputPath(sourcePath) ||
    isEditableDrawioImagePath(sourcePath)
  );
}

function asPngOutputPath(outputPath: string): `${string}.png` {
  if (!outputPath.toLowerCase().endsWith('.png')) {
    throw new Error(`PNG output path must end with .png: ${outputPath}`);
  }

  return outputPath as `${string}.png`;
}

function createMermaidPuppeteerConfig(options: MermaidPuppeteerOptions): Record<string, unknown> {
  if (options.executablePath) {
    return {
      executablePath: options.executablePath,
      headless: true,
    };
  }

  return {
    channel: options.browserChannel,
    headless: true,
  };
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
