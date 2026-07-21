import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Parser } from 'xml2js';
import { PDFDocument } from 'pdf-lib';

import {
  isDrawioPath,
  isEditableDrawioImagePath,
  logicalSourcePathForOutputTemplate,
} from '../application/source_format.js';
import { isWindowsReservedPathComponent, resolveOutputPath } from '../config/resolve_output_path.js';
import { assertExistingPathInWorkspace, assertWritablePathInWorkspace } from '../security/workspace_path.js';
import { assertPreflightPassed } from './input_preflight.js';

import type { CommittedConversionOutput, PreparedConversionOutput } from './commit_conversion_outputs.js';
import { runExternalTool } from './run_external_tool.js';
import { runStagedConversionBatch } from './run_staged_conversion_batch.js';
import type { ConversionRuntime } from './conversion_runtime.js';

export interface DrawioPdfJob {
  sourcePath: string;
  outputTemplate: string;
  workspacePath: string;
  workspaceName: string;
}

export interface ConvertDrawioToPdfOptions {
  jobs: DrawioPdfJob[];
  drawioPath: string;
  splitByPage: boolean;
  runId?: string;
  runtime?: ConversionRuntime;
  runDrawio?: RunDrawio;
}

export type RunDrawio = (
  executable: string,
  args: string[],
  signal?: AbortSignal,
  outputChannel?: ConversionRuntime['outputChannel'],
) => Promise<void>;

export async function convertDrawioToPdfFiles(
  options: ConvertDrawioToPdfOptions,
): Promise<CommittedConversionOutput[]> {
  const operationName = options.splitByPage ? 'convert-drawio-to-pdf' : 'convert-drawio-to-pdf-directly';
  validateJobs(options.jobs, options.splitByPage);
  await validateJobPaths(options.jobs, operationName);

  await assertPreflightPassed(options.jobs);

  const runId = options.runId ?? `${Date.now()}-${crypto.randomUUID()}`;

  return runStagedConversionBatch({
    jobs: options.jobs,
    operationName,
    runId,
    ...(options.runtime !== undefined && { runtime: options.runtime }),
    stage: (job, index, currentRunId, runtime) =>
      stageDrawioJob({
        job,
        index,
        runId: currentRunId,
        operationName,
        splitByPage: options.splitByPage,
        drawioPath: options.drawioPath,
        ...(options.runDrawio !== undefined && { runDrawio: options.runDrawio }),
        runtime,
      }),
  });
}

async function stageDrawioJob(options: {
  job: DrawioPdfJob;
  index: number;
  runId: string;
  operationName: string;
  splitByPage: boolean;
  drawioPath: string;
  runDrawio?: RunDrawio;
  runtime: ConversionRuntime;
}): Promise<PreparedConversionOutput[]> {
  const { job, index: jobIndex, runId, operationName, splitByPage, drawioPath, runDrawio, runtime } = options;
  const stageRootPath = path.join(job.workspacePath, '.latex-graphics-helper', operationName, runId);
  const logicalSourcePath = logicalSourcePathForOutputTemplate(job.sourcePath);
  const stageDirectory = path.join(
    stageRootPath,
    `${jobIndex + 1}-${safeName(path.basename(logicalSourcePath, path.extname(logicalSourcePath)))}`,
  );
  const allPagesPdfPath = path.join(stageDirectory, 'all-pages.pdf');

  runtime.signal?.throwIfAborted();
  await assertWritablePathInWorkspace(stageDirectory, job.workspacePath);
  await mkdir(stageDirectory, { recursive: true });
  const conversionInputPath = await prepareDrawioInput({
    sourcePath: job.sourcePath,
    stageDirectory,
    workspacePath: job.workspacePath,
    drawioPath,
    ...(runDrawio !== undefined && { runDrawio }),
    runtime,
  });

  await runDrawioCommand(
    drawioPath,
    [conversionInputPath, '-o', allPagesPdfPath, '-xf', 'pdf', '-t', '-a', '--crop'],
    runtime,
    runDrawio,
  );
  await assertExistingPathInWorkspace(allPagesPdfPath, job.workspacePath);

  const sourceDocument = await PDFDocument.load(await readFile(allPagesPdfPath));
  const pageCount = sourceDocument.getPageCount();
  if (pageCount === 0) {
    throw new Error(`Draw.io produced an empty PDF: ${job.sourcePath}`);
  }

  const outputContext = {
    sourcePath: logicalSourcePath,
    workspacePath: job.workspacePath,
    workspaceName: job.workspaceName,
  };

  if (!splitByPage) {
    const outputPath = resolveOutputPath(job.outputTemplate, outputContext);
    await assertWritablePathInWorkspace(outputPath, job.workspacePath);
    return [
      {
        stagedOutputPath: allPagesPdfPath,
        outputPath,
        workspacePath: job.workspacePath,
        stagingRootPath: stageRootPath,
      },
    ];
  }

  const pageNames = await readDrawioPageNames(conversionInputPath);
  if (pageNames.length !== pageCount) {
    throw new Error(
      `Draw.io page count does not match XML diagrams: ${job.sourcePath} (${pageCount} PDF pages, ${pageNames.length} diagrams)`,
    );
  }

  const pageDirectory = path.join(stageDirectory, 'pages');
  await assertWritablePathInWorkspace(pageDirectory, job.workspacePath);
  await mkdir(pageDirectory, { recursive: true });

  const outputs: PreparedConversionOutput[] = [];
  const usedPageNames = new Set<string>();
  for (let index = 0; index < pageCount; index += 1) {
    runtime.signal?.throwIfAborted();
    const pageDocument = await PDFDocument.create();
    const [page] = await pageDocument.copyPages(sourceDocument, [index]);
    if (!page) {
      throw new Error(`Could not copy Draw.io page ${index + 1}: ${job.sourcePath}`);
    }

    pageDocument.addPage(page);
    const stagedOutputPath = path.join(pageDirectory, `${index + 1}.pdf`);
    await assertWritablePathInWorkspace(stagedOutputPath, job.workspacePath);
    await writeFile(stagedOutputPath, await pageDocument.save());

    const outputPath = resolveOutputPath(job.outputTemplate, {
      ...outputContext,
      page: uniquePageName(safePageName(pageNames[index], index + 1), usedPageNames),
    });
    await assertWritablePathInWorkspace(outputPath, job.workspacePath);
    outputs.push({
      stagedOutputPath,
      outputPath,
      workspacePath: job.workspacePath,
      stagingRootPath: stageRootPath,
    });
  }

  return outputs;
}

async function prepareDrawioInput(options: {
  sourcePath: string;
  stageDirectory: string;
  workspacePath: string;
  drawioPath: string;
  runDrawio?: RunDrawio;
  runtime: ConversionRuntime;
}): Promise<string> {
  const drawioSourcePath = path.join(options.stageDirectory, 'source.drawio');
  await assertWritablePathInWorkspace(drawioSourcePath, options.workspacePath);
  options.runtime.signal?.throwIfAborted();
  if (isEditableDrawioImagePath(options.sourcePath)) {
    await runDrawioCommand(
      options.drawioPath,
      ['-x', '-f', 'xml', '-o', drawioSourcePath, options.sourcePath],
      options.runtime,
      options.runDrawio,
    );
  } else {
    await copyFile(options.sourcePath, drawioSourcePath);
  }
  await assertExistingPathInWorkspace(drawioSourcePath, options.workspacePath);
  return drawioSourcePath;
}

async function readDrawioPageNames(sourcePath: string): Promise<string[]> {
  const source = await readFile(sourcePath, 'utf8');
  const parsed = (await new Parser().parseStringPromise(source)) as {
    mxfile?: { diagram?: Array<{ $?: { name?: string } }> };
  };
  const diagrams = parsed.mxfile?.diagram ?? [];

  return diagrams.map((diagram, index) => diagram.$?.name ?? String(index + 1));
}

async function runDrawioCommand(
  executable: string,
  args: string[],
  runtime: ConversionRuntime,
  runDrawio?: RunDrawio,
): Promise<void> {
  await (runDrawio ?? executeDrawio)(executable, args, runtime.signal, runtime.outputChannel);
}

async function executeDrawio(
  executable: string,
  args: string[],
  signal?: AbortSignal,
  outputChannel?: ConversionRuntime['outputChannel'],
): Promise<void> {
  await runExternalTool({
    toolName: 'drawio',
    executable,
    args,
    ...(signal !== undefined && { signal }),
    ...(outputChannel !== undefined && { outputChannel }),
  });
}

async function validateJobPaths(jobs: DrawioPdfJob[], operationName: string): Promise<void> {
  await Promise.all(
    jobs.flatMap((job) => [
      assertExistingPathInWorkspace(job.sourcePath, job.workspacePath),
      assertWritablePathInWorkspace(
        path.join(job.workspacePath, '.latex-graphics-helper', operationName),
        job.workspacePath,
      ),
    ]),
  );
}

function validateJobs(jobs: DrawioPdfJob[], splitByPage: boolean): void {
  if (jobs.length === 0) {
    throw new Error('No Draw.io files were selected.');
  }

  for (const job of jobs) {
    if (!isDrawioPath(job.sourcePath)) {
      throw new Error(`Only Draw.io files are supported: ${job.sourcePath}`);
    }

    if (splitByPage && !job.outputTemplate.includes('${page}')) {
      throw new Error('outputPath.convertDrawioToPdf must contain ${page} for split Draw.io conversion.');
    }
  }
}

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_') || 'drawio';
}

function safePageName(value: string | undefined, page: number): string {
  const normalized = [...(value ?? String(page))]
    .map((character) => (character.charCodeAt(0) <= 31 ? '_' : character))
    .join('')
    .replace(/[\\/<>:"|?*]/g, '_')
    .trim()
    .replace(/[. ]+$/g, '');

  const pageName = normalized || String(page);
  return isWindowsReservedPathComponent(pageName) ? `_${pageName}` : pageName;
}

function uniquePageName(pageName: string, usedPageNames: Set<string>): string {
  const normalizedPageName = pageName.toLowerCase();
  let candidate = pageName;
  let suffix = 2;

  while (usedPageNames.has(candidate.toLowerCase())) {
    candidate = `${pageName}-${suffix}`;
    suffix += 1;
  }

  usedPageNames.add(normalizedPageName);
  usedPageNames.add(candidate.toLowerCase());
  return candidate;
}
