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

export type { CommittedConversionOutput, OutputConflictDecision, PreparedConversionOutput };
import type { ConversionRuntime } from './conversion_runtime.js';
import type { MermaidPuppeteerOptions, RunDrawio } from './convert_png_to_pdf.js';
import type { RunPdfToPng } from './convert_to_png.js';

// RunPdfToPng is defined in convert_to_png.ts and re-exported there.
import { runExternalTool } from './run_external_tool.js';
import { runPdftocairoWithAsciiScratch, type PdfToolScratchOptions } from './run_pdftocairo_with_ascii_scratch.js';
import { runStagedConversionBatch } from './run_staged_conversion_batch.js';

const execFileAsync = promisify(execFile);

export type RasterEncoder<Output> = (
  sourceBuffer: Buffer,
  outputPath: string,
  output: Output | undefined,
) => Promise<void>;

export interface RasterSourceOptions {
  drawioPath: string;
  runDrawio?: RunDrawio;
}

export interface RasterConversionDefinition<Output> {
  operationName: string;
  stagingDirectoryName: string;
  resultExtension: string;
  encoder: RasterEncoder<Output>;
  unsupportedInputMessage: (sourcePath: string) => string;
}

export interface RasterJob {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
  page?: number;
}

export interface ConvertToRasterFilesOptions<Output> extends PdfToolScratchOptions {
  jobs: RasterJob[];
  pdftocairoPath: string;
  mermaid: MermaidPuppeteerOptions;
  source: RasterSourceOptions;
  output?: Output;
  definition: RasterConversionDefinition<Output>;
  runPdfToPng?: RunPdfToPng;
  runId?: string;
  resolveOutputConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  signal?: AbortSignal;
}

interface RasterStageTools {
  pdftocairoPath: string;
  mermaid: MermaidPuppeteerOptions;
  source: RasterSourceOptions;
  runPdfToPng?: RunPdfToPng;
}

interface RasterStageContext<Output> {
  runId: string;
  runtime: Pick<ConversionRuntime, 'signal'>;
  tools: RasterStageTools;
  scratch: PdfToolScratchOptions;
  output: Output | undefined;
  definition: RasterConversionDefinition<Output>;
}

interface RasterStagePaths {
  stageDirectory: string;
  stagedOutputPath: string;
  stagingRootPath: string;
}

interface RasterRenderRequest {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
  stageDirectory?: string;
  page?: number;
}

export async function convertRasterFiles<Output>(
  options: ConvertToRasterFilesOptions<Output>,
): Promise<CommittedConversionOutput[]> {
  options.signal?.throwIfAborted();
  validateJobs(options.jobs, options.definition);
  await validateJobPaths(options.jobs, options.definition.stagingDirectoryName);
  options.signal?.throwIfAborted();

  const runId = options.runId ?? `${Date.now()}-${crypto.randomUUID()}`;
  const runtime: ConversionRuntime = {
    ...(options.signal !== undefined && { signal: options.signal }),
    ...(options.resolveOutputConflicts !== undefined && {
      resolveConflicts: options.resolveOutputConflicts,
    }),
    ...(options.outputChannel !== undefined && { outputChannel: options.outputChannel }),
  };
  const tools: RasterStageTools = {
    pdftocairoPath: options.pdftocairoPath,
    mermaid: options.mermaid,
    source: options.source,
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
    operationName: options.definition.operationName,
    runId,
    runtime,
    stage: (job, index, stageRunId, stageRuntime) =>
      stageRasterConversion(job, index, {
        runId: stageRunId,
        runtime: {
          ...(stageRuntime.signal !== undefined && { signal: stageRuntime.signal }),
        },
        tools,
        scratch,
        output: options.output,
        definition: options.definition,
      }),
  });
}

async function stageRasterConversion<Output>(
  job: RasterJob,
  index: number,
  context: RasterStageContext<Output>,
): Promise<PreparedConversionOutput> {
  context.runtime.signal?.throwIfAborted();
  const { stagingDirectoryName, resultExtension } = context.definition;
  const paths: RasterStagePaths = {
    stageDirectory: path.join(
      job.workspacePath,
      '.latex-graphics-helper',
      stagingDirectoryName,
      context.runId,
      `${index + 1}`,
    ),
    stagedOutputPath: path.join(
      job.workspacePath,
      '.latex-graphics-helper',
      stagingDirectoryName,
      context.runId,
      `${index + 1}`,
      `result.${resultExtension}`,
    ),
    stagingRootPath: path.join(job.workspacePath, '.latex-graphics-helper', stagingDirectoryName, context.runId),
  };

  await writeSourceAsRaster(job, paths, context);
  context.runtime.signal?.throwIfAborted();

  return {
    stagedOutputPath: paths.stagedOutputPath,
    outputPath: job.outputPath,
    workspacePath: job.workspacePath,
    stagingRootPath: paths.stagingRootPath,
  };
}

async function writeSourceAsRaster<Output>(
  job: RasterJob,
  paths: RasterStagePaths,
  context: RasterStageContext<Output>,
): Promise<void> {
  const sourcePath = job.sourcePath;
  const extension = path.extname(sourcePath).toLowerCase();

  if (isEditableDrawioImagePath(sourcePath)) {
    await writeDrawioAsRaster(job, paths, context);
    return;
  }

  const request: RasterRenderRequest = {
    sourcePath,
    outputPath: paths.stagedOutputPath,
    workspacePath: job.workspacePath,
    stageDirectory: paths.stageDirectory,
    ...(job.page !== undefined && { page: job.page }),
  };

  if (extension === '.pdf') {
    await writePdfPageAsRaster(request, context);
    return;
  }

  if (isMermaidPath(sourcePath)) {
    await writeMermaidAsRaster(request, context);
    return;
  }

  await writeImageAsRaster(request, context);
}

async function writeDrawioAsRaster<Output>(
  job: RasterJob,
  paths: RasterStagePaths,
  context: RasterStageContext<Output>,
): Promise<void> {
  context.runtime.signal?.throwIfAborted();
  const pdfPath = path.join(paths.stageDirectory, 'drawio.pdf');
  await assertWritablePathInWorkspace(pdfPath, job.workspacePath);
  await mkdir(path.dirname(pdfPath), { recursive: true });
  context.runtime.signal?.throwIfAborted();

  await (context.tools.source.runDrawio ?? executeDrawio)(
    context.tools.source.drawioPath,
    ['-x', '-f', 'pdf', '-o', pdfPath, job.sourcePath],
    context.runtime.signal,
  );
  await writePdfPageAsRaster(
    {
      sourcePath: pdfPath,
      outputPath: paths.stagedOutputPath,
      workspacePath: job.workspacePath,
      stageDirectory: paths.stageDirectory,
      page: job.page ?? 1,
    },
    context,
  );
}

async function writePdfPageAsRaster<Output>(
  request: RasterRenderRequest,
  context: RasterStageContext<Output>,
): Promise<void> {
  const pngPath = path.join(request.stageDirectory ?? path.dirname(request.outputPath), 'source.png');
  context.runtime.signal?.throwIfAborted();
  await assertWritablePathInWorkspace(pngPath, request.workspacePath);
  await mkdir(path.dirname(pngPath), { recursive: true });
  context.runtime.signal?.throwIfAborted();

  await runPdftocairoWithAsciiScratch({
    sourcePath: request.sourcePath,
    outputPath: pngPath,
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

  await writeImageAsRaster({ ...request, sourcePath: pngPath }, context);
}

async function writeMermaidAsRaster<Output>(
  request: RasterRenderRequest,
  context: RasterStageContext<Output>,
): Promise<void> {
  const pngPath = path.join(request.stageDirectory ?? path.dirname(request.outputPath), 'mermaid.png');
  context.runtime.signal?.throwIfAborted();
  await assertWritablePathInWorkspace(pngPath, request.workspacePath);
  await mkdir(path.dirname(pngPath), { recursive: true });
  context.runtime.signal?.throwIfAborted();

  try {
    await runMermaidCli(request.sourcePath, asPngOutputPath(pngPath), {
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

  await writeImageAsRaster({ ...request, sourcePath: pngPath }, context);
}

async function writeImageAsRaster<Output>(
  request: RasterRenderRequest,
  context: RasterStageContext<Output>,
): Promise<void> {
  context.runtime.signal?.throwIfAborted();
  await assertWritablePathInWorkspace(request.outputPath, request.workspacePath);
  await mkdir(path.dirname(request.outputPath), { recursive: true });
  const sourceBuffer = await readFile(request.sourcePath);
  context.runtime.signal?.throwIfAborted();
  await context.definition.encoder(sourceBuffer, request.outputPath, context.output);
}

async function executeDrawio(executable: string, args: string[], signal?: AbortSignal): Promise<void> {
  await runExternalTool({
    toolName: 'drawio',
    executable,
    args,
    ...(signal !== undefined && { signal }),
  });
}

async function validateJobPaths(jobs: RasterJob[], stagingDirectoryName: string): Promise<void> {
  await Promise.all(
    jobs.flatMap((job) => [
      assertExistingPathInWorkspace(job.sourcePath, job.workspacePath),
      assertWritablePathInWorkspace(job.outputPath, job.workspacePath),
      assertWritablePathInWorkspace(
        path.join(job.workspacePath, '.latex-graphics-helper', stagingDirectoryName),
        job.workspacePath,
      ),
    ]),
  );
}

function validateJobs<Output>(jobs: RasterJob[], definition: RasterConversionDefinition<Output>): void {
  if (jobs.length === 0) {
    throw new Error('No files were selected.');
  }

  for (const job of jobs) {
    if (!isSupportedSourcePath(job.sourcePath)) {
      throw new Error(definition.unsupportedInputMessage(job.sourcePath));
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

export function asPngOutputPath(outputPath: string): `${string}.png` {
  if (!outputPath.toLowerCase().endsWith('.png')) {
    throw new Error(`PNG output path must end with .png: ${outputPath}`);
  }

  return outputPath as `${string}.png`;
}

export function createMermaidPuppeteerConfig(options: MermaidPuppeteerOptions): Record<string, unknown> {
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

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    const stderr = 'stderr' in error && typeof error.stderr === 'string' ? error.stderr.trim() : '';
    return stderr ? `${error.message}\n${stderr}` : error.message;
  }

  return String(error);
}

export const pngEncoder: RasterEncoder<undefined> = async (sourceBuffer, outputPath) => {
  await sharp(sourceBuffer).png().toFile(outputPath);
};

export const jpegEncoder: RasterEncoder<undefined> = async (sourceBuffer, outputPath) => {
  await sharp(sourceBuffer).jpeg().toFile(outputPath);
};
