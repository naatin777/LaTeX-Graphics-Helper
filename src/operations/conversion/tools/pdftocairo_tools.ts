export type RunPdfToPng = (sourcePath: string, outputPath: string, page: number, signal?: AbortSignal) => Promise<void>;

export type RunPdfToSvg = (sourcePath: string, outputPath: string, page: number, signal?: AbortSignal) => Promise<void>;

export interface PdftocairoTools {
  pdftocairoPath: string;
  platform?: NodeJS.Platform;
  scratchBaseCandidates?: readonly string[];
  runPdfToPng?: RunPdfToPng;
  runPdfToSvg?: RunPdfToSvg;
}
