export type RunMermaid = (sourcePath: string, outputPath: string, signal?: AbortSignal) => Promise<void>;

export interface MermaidTools {
  browserChannel: string;
  executablePath?: string;
  theme: string;
  backgroundColor: string;
  run?: RunMermaid;
}
