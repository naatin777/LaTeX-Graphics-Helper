import { execFile } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { run as runMermaidCli } from '@mermaid-js/mermaid-cli';

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
import { convertEpsToPdf, type EpsToPdfOptions } from './eps_to_pdf.js';
import { assertPreflightPassed } from './input_preflight.js';
import { runExternalTool } from './run_external_tool.js';
import { runPdftocairoWithAsciiScratch, type PdfToolScratchOptions } from './run_pdftocairo_with_ascii_scratch.js';
import { runStagedConversionBatch } from './run_staged_conversion_batch.js';

const execFileAsync = promisify(execFile);

export type RasterEncoder = (sourceBuffer: Buffer, outputPath: string) => Promise<void>;

export interface DrawioOptions {
  drawioPath: string;
  runDrawio?: RunDrawio;
}

export interface RasterConversionDefinition {
  operationName: string;
  stagingDirectoryName: string;
  resultExtension: string;
  encoder: RasterEncoder;
  unsupportedInputMessage: (sourcePath: string) => string;
}

export interface RasterJob {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
  page?: number;
}

export type RunPdfToPng = (sourcePath: string, outputPath: string, page: number, signal?: AbortSignal) => Promise<void>;

export interface ConvertToRasterFilesOptions extends PdfToolScratchOptions {
  jobs: RasterJob[];
  runtime: ConversionRuntime;
  pdftocairoPath: string;
  ghostscriptPath: string;
  mermaid: MermaidPuppeteerOptions;
  drawio: DrawioOptions;
  runPdfToPng?: RunPdfToPng | undefined;
  runId?: string | undefined;
  definition: RasterConversionDefinition;
}

interface RasterStageTools {
  pdftocairoPath: string;
  ghostscriptPath: string;
  mermaid: MermaidPuppeteerOptions;
  drawio: DrawioOptions;
  runPdfToPng: RunPdfToPng | undefined;
}

interface RasterStageContext {
  runId: string;
  runtime: ConversionRuntime;
  tools: RasterStageTools;
  scratch: PdfToolScratchOptions;
  definition: RasterConversionDefinition;
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

export async function convertRasterFiles(options: ConvertToRasterFilesOptions): Promise<CommittedConversionOutput[]> {
  options.runtime.signal?.throwIfAborted();
  validateJobs(options.jobs, options.definition);
  await validateJobPaths(options.jobs, options.definition.stagingDirectoryName);
  options.runtime.signal?.throwIfAborted();

  await assertPreflightPassed(options.jobs, options.runtime.outputChannel);
  options.runtime.signal?.throwIfAborted();

  const runId = options.runId ?? `${Date.now()}-${crypto.randomUUID()}`;
  const tools: RasterStageTools = {
    pdftocairoPath: options.pdftocairoPath,
    ghostscriptPath: options.ghostscriptPath,
    mermaid: options.mermaid,
    drawio: options.drawio,
    runPdfToPng: options.runPdfToPng,
  };
  const scratch: PdfToolScratchOptions = {
    platform: options.platform,
    scratchBaseCandidates: options.scratchBaseCandidates,
  };
  return runStagedConversionBatch({
    jobs: options.jobs,
    operationName: options.definition.operationName,
    runId,
    runtime: options.runtime,
    stage: (job, index, stageRunId, stageRuntime) =>
      stageRasterConversion(job, index, {
        runId: stageRunId,
        runtime: stageRuntime,
        tools,
        scratch,
        definition: options.definition,
      }),
  });
}

async function stageRasterConversion(
  job: RasterJob,
  index: number,
  context: RasterStageContext,
): Promise<PreparedConversionOutput> {
  context.runtime.signal?.throwIfAborted();
  const { stagingDirectoryName, resultExtension } = context.definition;
  const stagingRootPath = path.join(job.workspacePath, '.latex-graphics-helper', stagingDirectoryName, context.runId);
  const stageDirectory = path.join(stagingRootPath, `${index + 1}`);
  const stagedOutputPath = path.join(stageDirectory, `result.${resultExtension}`);

  await writeSourceAsRaster(job, { stageDirectory, stagedOutputPath, stagingRootPath }, context);
  context.runtime.signal?.throwIfAborted();

  return {
    stagedOutputPath,
    outputPath: job.outputPath,
    workspacePath: job.workspacePath,
    stagingRootPath,
  };
}

async function writeSourceAsRaster(
  job: RasterJob,
  paths: RasterStagePaths,
  context: RasterStageContext,
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

  if (extension === '.eps') {
    await writeEpsAsRaster(job, paths, context);
    return;
  }

  if (isMermaidPath(sourcePath)) {
    await writeMermaidAsRaster(request, context);
    return;
  }

  await writeImageAsRaster(request, context);
}

async function writeDrawioAsRaster(
  job: RasterJob,
  paths: RasterStagePaths,
  context: RasterStageContext,
): Promise<void> {
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

async function writePdfPageAsRaster(request: RasterRenderRequest, context: RasterStageContext): Promise<void> {
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
    signal: context.runtime.signal,
    outputChannel: context.runtime.outputChannel,
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

async function writeMermaidAsRaster(request: RasterRenderRequest, context: RasterStageContext): Promise<void> {
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

async function writeEpsAsRaster(job: RasterJob, paths: RasterStagePaths, context: RasterStageContext): Promise<void> {
  context.runtime.signal?.throwIfAborted();
  const epsStaging = path.join(paths.stageDirectory, 'eps');
  await mkdir(epsStaging, { recursive: true });
  context.runtime.signal?.throwIfAborted();

  const epsOptions: EpsToPdfOptions = {
    epsPath: job.sourcePath,
    workspacePath: job.workspacePath,
    ghostscriptPath: context.tools.ghostscriptPath,
    stagingDirectory: epsStaging,
  };
  if (context.runtime.signal !== undefined) { epsOptions.signal = context.runtime.signal; }
  if (context.runtime.outputChannel !== undefined) { epsOptions.outputChannel = context.runtime.outputChannel; }
  if (context.scratch.scratchBaseCandidates !== undefined) { epsOptions.scratchBaseCandidates = context.scratch.scratchBaseCandidates; }
  if (context.scratch.platform !== undefined) { epsOptions.platform = context.scratch.platform; }
  const { pdfPath } = await convertEpsToPdf(epsOptions);

  context.runtime.signal?.throwIfAborted();
  await writePdfPageAsRaster(
    { sourcePath: pdfPath, outputPath: paths.stagedOutputPath, workspacePath: job.workspacePath, page: 1 },
    context,
  );
}

async function writeImageAsRaster(request: RasterRenderRequest, context: RasterStageContext): Promise<void> {
  context.runtime.signal?.throwIfAborted();
  await assertWritablePathInWorkspace(request.outputPath, request.workspacePath);
  await mkdir(path.dirname(request.outputPath), { recursive: true });
  const sourceBuffer = await readFile(request.sourcePath);
  context.runtime.signal?.throwIfAborted();
  await context.definition.encoder(sourceBuffer, request.outputPath);
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

function validateJobs(jobs: RasterJob[], definition: RasterConversionDefinition): void {
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
    extension === '.eps' ||
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
