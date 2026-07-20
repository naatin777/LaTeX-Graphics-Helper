import { type CommittedConversionOutput, convertRasterFiles, pngEncoder } from './raster_conversion.js';
import { type MermaidPuppeteerOptions, type RunDrawio } from './convert_png_to_pdf.js';
import { type PdfToolScratchOptions } from './run_pdftocairo_with_ascii_scratch.js';
import { type OutputConflictDecision } from './commit_conversion_outputs.js';

export interface ConvertToPngJob {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
  page?: number;
}

export interface DrawioToPngOptions {
  drawioPath: string;
  runDrawio?: RunDrawio;
}

export type RunPdfToPng = (sourcePath: string, outputPath: string, page: number, signal?: AbortSignal) => Promise<void>;

export interface ConvertToPngFilesOptions extends PdfToolScratchOptions {
  jobs: ConvertToPngJob[];
  pdftocairoPath: string;
  mermaid: MermaidPuppeteerOptions;
  drawio: DrawioToPngOptions;
  runPdfToPng?: RunPdfToPng;
  runId?: string;
  resolveOutputConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  signal?: AbortSignal;
}

export async function convertToPngFiles(options: ConvertToPngFilesOptions): Promise<CommittedConversionOutput[]> {
  return convertRasterFiles({
    ...options,
    source: options.drawio,
    output: undefined,
    definition: {
      operationName: 'convert-to-png',
      stagingDirectoryName: 'convert-to-png',
      resultExtension: 'png',
      encoder: pngEncoder,
      unsupportedInputMessage: (sourcePath) => `Unsupported input for PNG conversion: ${sourcePath}`,
    },
  });
}
