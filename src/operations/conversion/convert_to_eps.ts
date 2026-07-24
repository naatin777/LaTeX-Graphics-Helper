import { execFile } from 'node:child_process';
import { copyFile, mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { PDFDocument } from 'pdf-lib';

import { assertPreflightPassed, preflightOptionsFromRuntime } from '../input/input_preflight.js';
import type { ConversionRuntime } from '../lifecycle/conversion_runtime.js';
import {
  type CommittedConversionOutput,
  type PreparedConversionOutput,
} from '../lifecycle/commit_conversion_outputs.js';
import { runStagedConversionBatch } from '../lifecycle/run_staged_conversion_batch.js';
import {
  createAsciiInputOutputScratch,
  defaultWindowsScratchBaseCandidates,
  removeSuccessfulScratch,
  validateAsciiScratchInput,
  validateAsciiScratchOutput,
  type LineOutputChannel,
} from '../external_tools/external_tool_ascii_scratch.js';
import { writeSourceAsPdf } from './convert_to_pdf.js';
import type { DrawioTools, MermaidTools, RunGhostscript, SvgToPdfTools } from './tools/index.js';
import { assertExistingPathInWorkspace, assertWritablePathInWorkspace } from '../../security/workspace_path.js';
import { isMermaidPath, isSupportedImageInputPath } from '../../application/policy/source_format.js';

const execFileAsync = promisify(execFile);
const DEFAULT_EXTENSIONS = ['.pdf', '.svg', '.eps', '.mmd', '.mermaid'] as const;

export interface ConvertToEpsJob {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
  page?: number;
}

export interface ConvertToEpsFilesOptions {
  jobs: ConvertToEpsJob[];
  runtime: ConversionRuntime;
  ghostscriptPath: string;
  svgToPdfTools?: SvgToPdfTools;
  mermaidTools?: MermaidTools;
  drawioTools?: DrawioTools;
  maxInputPixels?: number;
  runGhostscript?: RunGhostscript;
  runId?: string;
  platform?: NodeJS.Platform;
  scratchBaseCandidates?: readonly string[];
  supportedExtensions?: readonly string[];
}

export async function convertToEpsFiles(options: ConvertToEpsFilesOptions): Promise<CommittedConversionOutput[]> {
  options.runtime.signal?.throwIfAborted();
  const supportedExtensions = options.supportedExtensions ?? DEFAULT_EXTENSIONS;
  validateJobs(options.jobs, supportedExtensions);
  await validateJobPaths(options.jobs);
  await assertPreflightPassed(options.jobs, {
    ...preflightOptionsFromRuntime(options.runtime),
    ...(options.maxInputPixels === undefined ? {} : { maxInputPixels: options.maxInputPixels }),
  });
  options.runtime.signal?.throwIfAborted();

  const runId = options.runId ?? `${Date.now()}-${crypto.randomUUID()}`;
  return runStagedConversionBatch({
    jobs: options.jobs,
    operationName: 'convert-to-eps',
    runId,
    runtime: options.runtime,
    stage: (job, index, stageRunId, runtime) => stageSourceToEps(job, index, stageRunId, runtime, options),
  });
}

async function stageSourceToEps(
  job: ConvertToEpsJob,
  index: number,
  runId: string,
  runtime: ConversionRuntime,
  options: ConvertToEpsFilesOptions,
): Promise<PreparedConversionOutput> {
  runtime.signal?.throwIfAborted();
  const stagingRootPath = path.join(job.workspacePath, '.latex-graphics-helper', 'convert-to-eps', runId);
  const stageDirectory = path.join(stagingRootPath, `${index + 1}`);
  const pdfPath = path.join(stageDirectory, 'source.pdf');
  const stagedOutputPath = path.join(stageDirectory, 'result.eps');
  await mkdir(stageDirectory, { recursive: true });

  const writeOptions: Parameters<typeof writeSourceAsPdf>[0] = {
    sourcePath: job.sourcePath,
    outputPath: pdfPath,
    workspacePath: job.workspacePath,
    ghostscriptPath: options.ghostscriptPath,
  };
  if (runtime.signal !== undefined) {
    writeOptions.signal = runtime.signal;
  }
  if (options.maxInputPixels !== undefined) {
    writeOptions.maxInputPixels = options.maxInputPixels;
  }
  if (job.page !== undefined) {
    writeOptions.page = job.page;
  }
  if (options.svgToPdfTools !== undefined) {
    writeOptions.svgToPdfTools = options.svgToPdfTools;
  }
  if (options.mermaidTools !== undefined) {
    writeOptions.mermaidTools = options.mermaidTools;
  }
  if (options.drawioTools !== undefined) {
    writeOptions.drawioTools = options.drawioTools;
  }
  await writeSourceAsPdf(writeOptions);
  runtime.signal?.throwIfAborted();
  const runOptions: Parameters<typeof runPdfToEps>[0] = {
    pdfPath,
    epsPath: stagedOutputPath,
    ghostscriptPath: options.ghostscriptPath,
  };
  if (runtime.signal !== undefined) {
    runOptions.signal = runtime.signal;
  }
  if (options.runGhostscript !== undefined) {
    runOptions.runGhostscript = options.runGhostscript;
  }
  if (options.platform !== undefined) {
    runOptions.platform = options.platform;
  }
  if (options.scratchBaseCandidates !== undefined) {
    runOptions.scratchBaseCandidates = options.scratchBaseCandidates;
  }
  if (runtime.outputChannel !== undefined) {
    runOptions.outputChannel = runtime.outputChannel;
  }
  if (job.page !== undefined) {
    runOptions.page = job.page;
  }
  await runPdfToEps(runOptions);
  runtime.signal?.throwIfAborted();

  return { stagedOutputPath, outputPath: job.outputPath, workspacePath: job.workspacePath, stagingRootPath };
}

export async function runPdfToEps(options: {
  pdfPath: string;
  epsPath: string;
  ghostscriptPath: string;
  signal?: AbortSignal;
  runGhostscript?: RunGhostscript;
  platform?: NodeJS.Platform;
  scratchBaseCandidates?: readonly string[];
  outputChannel?: LineOutputChannel;
  page?: number;
}): Promise<void> {
  options.signal?.throwIfAborted();
  await assertWritablePathInWorkspace(options.epsPath, path.dirname(options.epsPath));
  await mkdir(path.dirname(options.epsPath), { recursive: true });
  const runGhostscript = options.runGhostscript ?? executeGhostscript;
  const argsFor = (inputPath: string, outputPath: string) => [
    '-dSAFER',
    '-dNOPAUSE',
    '-dBATCH',
    '-sDEVICE=eps2write',
    '-dEPSCrop',
    ...(options.page === undefined ? [] : ['-dFirstPage=' + options.page, '-dLastPage=' + options.page]),
    `-sOutputFile=${outputPath}`,
    inputPath,
  ];

  if ((options.platform ?? process.platform) === 'win32') {
    const scratch = await createAsciiInputOutputScratch({
      baseCandidates: options.scratchBaseCandidates ?? defaultWindowsScratchBaseCandidates(),
      inputFileName: 'source.pdf',
      outputFileName: 'output.eps',
      ...(options.signal === undefined ? {} : { signal: options.signal }),
      ...(options.outputChannel === undefined ? {} : { outputChannel: options.outputChannel }),
      toolName: 'Ghostscript',
    });
    let succeeded = false;
    try {
      await copyFile(options.pdfPath, scratch.inputPath);
      await validateAsciiScratchInput(scratch);
      await runGhostscript(options.ghostscriptPath, argsFor(scratch.inputPath, scratch.outputPath), options.signal);
      options.signal?.throwIfAborted();
      await validateAsciiScratchOutput(scratch);
      await copyFile(scratch.outputPath, options.epsPath);
      await validateGeneratedEps(options.epsPath);
      succeeded = true;
    } finally {
      if (succeeded) {
        await removeSuccessfulScratch(scratch, options.outputChannel);
      } else {
        options.outputChannel?.appendLine(`[scratch] retained after failure or cancellation: ${scratch.rootPath}`);
      }
    }
    return;
  }

  await runGhostscript(options.ghostscriptPath, argsFor(options.pdfPath, options.epsPath), options.signal);
  options.signal?.throwIfAborted();
  await validateGeneratedEps(options.epsPath);
}

export async function validateGeneratedEps(epsPath: string): Promise<void> {
  const fileStat = await stat(epsPath);
  if (!fileStat.isFile() || fileStat.size === 0) {
    throw new Error(`EPS conversion produced empty output: ${epsPath}`);
  }
  const content = await readFile(epsPath, 'utf8');
  if (!content.startsWith('%!PS')) {
    throw new Error(`EPS conversion produced non-EPS output: ${epsPath}`);
  }
  const boundingBox = content.match(/^%%BoundingBox:\s*(.*?)\s*$/mu)?.[1];
  if (boundingBox === undefined || boundingBox === '(atend)') {
    throw new Error(`EPS conversion produced no usable BoundingBox: ${epsPath}`);
  }
  const values = boundingBox.trim().split(/\s+/u).map(Number);
  if (values.length !== 4 || !values.every(Number.isFinite) || values[0]! >= values[2]! || values[1]! >= values[3]!) {
    throw new Error(`EPS conversion produced an invalid BoundingBox: ${epsPath}`);
  }
}

async function executeGhostscript(executable: string, args: string[], signal?: AbortSignal): Promise<void> {
  await execFileAsync(executable, args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, signal });
}

async function validateJobPaths(jobs: ConvertToEpsJob[]): Promise<void> {
  await Promise.all(
    jobs.flatMap((job) => [
      assertExistingPathInWorkspace(job.sourcePath, job.workspacePath),
      assertWritablePathInWorkspace(job.outputPath, job.workspacePath),
      assertWritablePathInWorkspace(
        path.join(job.workspacePath, '.latex-graphics-helper', 'convert-to-eps'),
        job.workspacePath,
      ),
    ]),
  );
}

function validateJobs(jobs: ConvertToEpsJob[], supportedExtensions: readonly string[]): void {
  if (jobs.length === 0) {
    throw new Error('No files were selected.');
  }
  const extensions = new Set(supportedExtensions.map((extension) => extension.toLowerCase()));
  for (const job of jobs) {
    const extension = path.extname(job.sourcePath).toLowerCase();
    if (!extensions.has(extension) && !isSupportedImageInputPath(job.sourcePath) && !isMermaidPath(job.sourcePath)) {
      throw new Error(`Unsupported input format: ${job.sourcePath}`);
    }
  }
}

export async function assertPdfHasPages(pdfPath: string): Promise<number> {
  const document = await PDFDocument.load(await readFile(pdfPath));
  const pages = document.getPageCount();
  if (pages === 0) {
    throw new Error(`PDF has no pages: ${pdfPath}`);
  }
  return pages;
}
