import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import { assertExistingPathInWorkspace, assertWritablePathInWorkspace } from '../../security/workspace_path.js';
import type { CommittedConversionOutput, PreparedConversionOutput } from '../lifecycle/commit_conversion_outputs.js';
import type { ConversionRuntime } from '../lifecycle/conversion_runtime.js';
import { runStagedConversionBatch } from '../lifecycle/run_staged_conversion_batch.js';
import { assertPreflightPassed, preflightOptionsFromRuntime } from '../input/input_preflight.js';

export interface RawSidecar {
  width: number;
  height: number;
  channels: 1 | 2 | 3 | 4;
}

export interface ConvertToRawJob {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
}

export interface ConvertToRawFilesOptions {
  jobs: ConvertToRawJob[];
  runtime: ConversionRuntime;
  runId?: string;
}

export async function convertToRawFiles(options: ConvertToRawFilesOptions): Promise<CommittedConversionOutput[]> {
  if (options.jobs.length === 0) {
    throw new Error('No files were selected.');
  }

  await Promise.all(
    options.jobs.flatMap((job) => [
      assertExistingPathInWorkspace(job.sourcePath, job.workspacePath),
      assertWritablePathInWorkspace(job.outputPath, job.workspacePath),
      assertWritablePathInWorkspace(`${job.outputPath}.json`, job.workspacePath),
    ]),
  );
  const sidecars = await Promise.all(options.jobs.map((job) => readRawSidecar(job.sourcePath, job.workspacePath)));
  options.runtime.signal?.throwIfAborted();
  await assertPreflightPassed(options.jobs, {
    ...preflightOptionsFromRuntime(options.runtime),
  });

  return runStagedConversionBatch({
    jobs: options.jobs,
    operationName: 'convert-to-raw',
    runId: options.runId ?? `${Date.now()}-${crypto.randomUUID()}`,
    runtime: options.runtime,
    stage: async (job, index, runId, runtime) => {
      runtime.signal?.throwIfAborted();
      const sidecar = sidecars[index];
      const stagingRootPath = path.join(job.workspacePath, '.latex-graphics-helper', 'convert-to-raw', runId);
      const stageDirectory = path.join(stagingRootPath, String(index + 1));
      const stagedOutputPath = path.join(stageDirectory, 'result.raw');
      const stagedSidecarPath = `${stagedOutputPath}.json`;

      await assertWritablePathInWorkspace(stagedOutputPath, job.workspacePath);
      await assertWritablePathInWorkspace(stagedSidecarPath, job.workspacePath);
      await mkdir(stageDirectory, { recursive: true });
      runtime.signal?.throwIfAborted();

      const image =
        sidecar === undefined ? sharp(job.sourcePath) : sharp(await readFile(job.sourcePath), { raw: sidecar });
      const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
      const outputSidecar: RawSidecar = {
        width: info.width,
        height: info.height,
        channels: toRawChannels(info.channels),
      };
      await writeFile(stagedOutputPath, data);
      runtime.signal?.throwIfAborted();
      await writeFile(stagedSidecarPath, `${JSON.stringify(outputSidecar, null, 2)}\n`);

      const outputs: PreparedConversionOutput[] = [
        {
          stagedOutputPath,
          outputPath: job.outputPath,
          workspacePath: job.workspacePath,
          stagingRootPath,
        },
        {
          stagedOutputPath: stagedSidecarPath,
          outputPath: `${job.outputPath}.json`,
          workspacePath: job.workspacePath,
          stagingRootPath,
        },
      ];
      return outputs;
    },
  });
}

export async function readRawSidecar(sourcePath: string, workspacePath: string): Promise<RawSidecar | undefined> {
  if (!sourcePath.toLowerCase().endsWith('.raw')) {
    return undefined;
  }

  const sidecarPath = `${sourcePath}.json`;
  await assertExistingPathInWorkspace(sourcePath, workspacePath);
  await assertExistingPathInWorkspace(sidecarPath, workspacePath);

  let value: unknown;
  try {
    value = JSON.parse(await readFile(sidecarPath, 'utf8')) as unknown;
  } catch (error) {
    throw new Error(`Invalid Raw sidecar: ${sidecarPath}`, { cause: error });
  }

  if (!isRawSidecar(value)) {
    throw new Error(`Invalid Raw sidecar: ${sidecarPath}; expected positive width, height, and channels 1-4.`);
  }

  return value;
}

function toRawChannels(value: number): RawSidecar['channels'] {
  if (value === 1 || value === 2 || value === 3 || value === 4) {
    return value;
  }

  throw new Error(`Unsupported raw channel count: ${value}`);
}

function isRawSidecar(value: unknown): value is RawSidecar {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    isPositiveInteger(candidate.width) &&
    isPositiveInteger(candidate.height) &&
    (candidate.channels === 1 || candidate.channels === 2 || candidate.channels === 3 || candidate.channels === 4)
  );
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}
