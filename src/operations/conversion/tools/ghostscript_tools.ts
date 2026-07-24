export type RunGhostscript = (executable: string, args: string[], signal?: AbortSignal) => Promise<void>;

export interface GhostscriptTools {
  ghostscriptPath: string;
  platform?: NodeJS.Platform;
  scratchBaseCandidates?: readonly string[];
  runGhostscript?: RunGhostscript;
}
