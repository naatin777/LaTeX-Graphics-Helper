import sharp from 'sharp';

import { type CommittedConversionOutput, convertRasterFiles, type RasterEncoder } from './raster_conversion.js';
import { type MermaidPuppeteerOptions, type RunDrawio } from './convert_png_to_pdf.js';
import { type RunPdfToPng } from './convert_to_png.js';
import { type PdfToolScratchOptions } from './run_pdftocairo_with_ascii_scratch.js';
import { type OutputConflictDecision } from './commit_conversion_outputs.js';

export interface ConvertToWebpJob {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
  page?: number;
}

export interface DrawioToWebpOptions {
  drawioPath: string;
  runDrawio?: RunDrawio;
}

export interface WebpOutputOptions {
  effort: number;
}

export interface ConvertToWebpFilesOptions extends PdfToolScratchOptions {
  jobs: ConvertToWebpJob[];
  pdftocairoPath: string;
  mermaid: MermaidPuppeteerOptions;
  drawio: DrawioToWebpOptions;
  webp: WebpOutputOptions;
  runPdfToPng?: RunPdfToPng;
  runId?: string;
  resolveOutputConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  signal?: AbortSignal;
}

const webpEncoder: RasterEncoder<WebpOutputOptions> = async (sourceBuffer, outputPath, output) => {
  await sharp(sourceBuffer)
    .webp({ effort: output?.effort ?? 4 })
    .toFile(outputPath);
};

export async function convertToWebpFiles(options: ConvertToWebpFilesOptions): Promise<CommittedConversionOutput[]> {
  return convertRasterFiles({
    ...options,
    source: options.drawio,
    output: options.webp,
    definition: {
      operationName: 'convert-to-webp',
      stagingDirectoryName: 'convert-to-webp',
      resultExtension: 'webp',
      encoder: webpEncoder,
      unsupportedInputMessage: (sourcePath) => `Unsupported input for WebP conversion: ${sourcePath}`,
    },
  });
}
