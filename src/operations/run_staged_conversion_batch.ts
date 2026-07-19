import pLimit from 'p-limit';

import { stagingArtifactsForJobs, withStagingCleanup } from './cleanup_conversion_artifacts.js';
import {
  commitConversionOutputs,
  type CommittedConversionOutput,
  type PreparedConversionOutput,
} from './commit_conversion_outputs.js';
import type { ConversionRuntime } from './conversion_runtime.js';

const CONVERSION_CONCURRENCY = 2;

export interface StagedConversionBatch<Job extends { workspacePath: string }> {
  jobs: Job[];
  operationName: string;
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
  const artifacts = stagingArtifactsForJobs(options.jobs, options.operationName, options.runId);

  return withStagingCleanup(
    artifacts,
    async () => {
      const limit = pLimit(CONVERSION_CONCURRENCY);
      const stagedOutputs = (
        await Promise.all(
          options.jobs.map((job, index) => limit(() => options.stage(job, index, options.runId, runtime))),
        )
      ).flat();
      runtime.signal?.throwIfAborted();
      return commitConversionOutputs(stagedOutputs, {
        ...(runtime.signal !== undefined && { signal: runtime.signal }),
        ...(runtime.resolveConflicts !== undefined && {
          resolveConflicts: runtime.resolveConflicts,
        }),
        operationName: options.operationName,
        ...(runtime.outputChannel !== undefined && { outputChannel: runtime.outputChannel }),
      });
    },
    runtime.outputChannel,
  );
}
