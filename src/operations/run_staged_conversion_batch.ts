import pLimit from 'p-limit';

import { stagingArtifactsForJobs, withStagingCleanup } from './cleanup_conversion_artifacts.js';
import {
  commitConversionOutputs,
  type CommitConversionOutputsOptions,
  type CommittedConversionOutput,
  type PreparedConversionOutput,
} from './commit_conversion_outputs.js';
import type { ConversionRuntime } from './conversion_runtime.js';

const CONVERSION_CONCURRENCY = 2;

export interface StagedConversionBatch<Job extends { workspacePath: string }> {
  jobs: Job[];
  operationName: string;
  stagingOperationName?: string;
  runId: string;
  runtime?: ConversionRuntime;
  stage: (
    job: Job,
    index: number,
    runId: string,
    runtime: ConversionRuntime,
  ) => Promise<PreparedConversionOutput | PreparedConversionOutput[]>;
}

/** Runs the shared staging/commit lifecycle; source dispatch stays with each operation. */
export async function runStagedConversionBatch<Job extends { workspacePath: string }>(
  options: StagedConversionBatch<Job>,
): Promise<CommittedConversionOutput[]> {
  const runtime = options.runtime ?? {};
  const artifacts = stagingArtifactsForJobs(
    options.jobs,
    options.stagingOperationName ?? options.operationName,
    options.runId,
  );
  const abortController = new AbortController();
  const abortFromCaller = () => abortController.abort(options.runtime?.signal?.reason);

  if (options.runtime?.signal?.aborted) {
    abortFromCaller();
  } else {
    options.runtime?.signal?.addEventListener('abort', abortFromCaller, { once: true });
  }

  const batchRuntime: ConversionRuntime = {
    ...runtime,
    signal: abortController.signal,
  };
  const signal = abortController.signal;

  try {
    return await withStagingCleanup(
      artifacts,
      async () => {
        const limit = pLimit(CONVERSION_CONCURRENCY);
        const settled = await Promise.allSettled(
          options.jobs.map((job, index) =>
            limit(async () => {
              batchRuntime.signal?.throwIfAborted();
              try {
                return await options.stage(job, index, options.runId, batchRuntime);
              } catch (error) {
                const stageError = error instanceof Error ? error : new Error(String(error));
                abortController.abort(stageError);
                throw stageError;
              }
            }),
          ),
        );
        const failure =
          settled.find((result) => result.status === 'rejected' && !isAbortError(result.reason)) ??
          settled.find((result) => result.status === 'rejected');
        if (failure?.status === 'rejected') {
          throw failure.reason;
        }

        signal.throwIfAborted();
        const stagedOutputs = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
        const commitOptions: CommitConversionOutputsOptions = { signal, operationName: options.operationName };
        if (runtime.resolveConflicts !== undefined) commitOptions.resolveConflicts = runtime.resolveConflicts;
        if (runtime.outputChannel !== undefined) commitOptions.outputChannel = runtime.outputChannel;
        return commitConversionOutputs(stagedOutputs.flat(), commitOptions);
      },
      runtime.outputChannel,
    );
  } finally {
    options.runtime?.signal?.removeEventListener('abort', abortFromCaller);
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
