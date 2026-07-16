import pLimit from "p-limit";

import {
  commitConversionOutputs,
  type CommittedConversionOutput,
  type OutputConflictDecision,
  type PreparedConversionOutput,
} from "./commit_conversion_outputs.js";
import { stagingArtifactsForJobs, withStagingCleanup } from "./cleanup_conversion_artifacts.js";
import type { LineOutputChannel } from "./external_tool_ascii_scratch.js";

const RASTER_CONVERSION_CONCURRENCY = 2;

export async function runRasterConversionPipeline<Job extends { workspacePath: string }>(options: {
  jobs: Job[];
  operationName: string;
  runId: string;
  signal?: AbortSignal;
  resolveOutputConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  outputChannel?: LineOutputChannel;
  stage: (
    job: Job,
    index: number,
    runId: string,
    signal?: AbortSignal,
  ) => Promise<PreparedConversionOutput>;
}): Promise<CommittedConversionOutput[]> {
  const artifacts = stagingArtifactsForJobs(options.jobs, options.operationName, options.runId);

  return withStagingCleanup(
    artifacts,
    async () => {
      const limit = pLimit(RASTER_CONVERSION_CONCURRENCY);
      const stagedOutputs = await Promise.all(
        options.jobs.map((job, index) =>
          limit(() => options.stage(job, index, options.runId, options.signal)),
        ),
      );
      options.signal?.throwIfAborted();
      return commitConversionOutputs(stagedOutputs, {
        ...(options.signal !== undefined && { signal: options.signal }),
        ...(options.resolveOutputConflicts !== undefined && {
          resolveConflicts: options.resolveOutputConflicts,
        }),
        operationName: options.operationName,
        ...(options.outputChannel !== undefined && { outputChannel: options.outputChannel }),
      });
    },
    options.outputChannel,
  );
}
