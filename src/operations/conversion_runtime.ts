import type { OutputConflictDecision } from './commit_conversion_outputs.js';
import type { LineOutputChannel } from './external_tool_ascii_scratch.js';

export type ConflictResolver = (conflicts: string[]) => Promise<OutputConflictDecision>;

/** Dependencies shared by one conversion run, not by an individual source job. */
export interface ConversionRuntime {
  signal?: AbortSignal;
  outputChannel?: LineOutputChannel;
  resolveConflicts?: ConflictResolver;
}
