import { type CommittedConversionOutput, convertRasterFiles, jpegEncoder } from './raster_conversion.js';
import { type MermaidPuppeteerOptions, type RunDrawio } from './convert_png_to_pdf.js';
import { type RunPdfToPng } from './convert_to_png.js';
import { type PdfToolScratchOptions } from './run_pdftocairo_with_ascii_scratch.js';
import { type OutputConflictDecision } from './commit_conversion_outputs.js';

export interface ConvertToJpegJob {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
  page?: number;
}

export interface DrawioToJpegOptions {
  drawioPath: string;
  runDrawio?: RunDrawio;
}

export interface ConvertToJpegFilesOptions extends PdfToolScratchOptions {
  jobs: ConvertToJpegJob[];
  pdftocairoPath: string;
  mermaid: MermaidPuppeteerOptions;
  drawio: DrawioToJpegOptions;
  runPdfToPng?: RunPdfToPng;
  runId?: string;
  resolveOutputConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  signal?: AbortSignal;
}

export async function convertToJpegFiles(options: ConvertToJpegFilesOptions): Promise<CommittedConversionOutput[]> {
  return convertRasterFiles({
    ...options,
    source: options.drawio,
    output: undefined,
    definition: {
      operationName: 'convert-to-jpeg',
      stagingDirectoryName: 'convert-to-jpeg',
      resultExtension: 'jpeg',
      encoder: jpegEncoder,
      unsupportedInputMessage: (sourcePath) => `Unsupported input for JPEG conversion: ${sourcePath}`,
    },
  });
}
