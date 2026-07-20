import sharp from 'sharp';

import { type CommittedConversionOutput, convertRasterFiles, type RasterEncoder } from './raster_conversion.js';
import { type MermaidPuppeteerOptions, type RunDrawio } from './convert_png_to_pdf.js';
import { type RunPdfToPng } from './convert_to_png.js';
import { type PdfToolScratchOptions } from './run_pdftocairo_with_ascii_scratch.js';
import { type OutputConflictDecision } from './commit_conversion_outputs.js';

export interface ConvertToAvifJob {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
  page?: number;
}

export interface DrawioToAvifOptions {
  drawioPath: string;
  runDrawio?: RunDrawio;
}

export interface AvifOutputOptions {
  effort: number;
}

export interface ConvertToAvifFilesOptions extends PdfToolScratchOptions {
  jobs: ConvertToAvifJob[];
  pdftocairoPath: string;
  mermaid: MermaidPuppeteerOptions;
  drawio: DrawioToAvifOptions;
  avif: AvifOutputOptions;
  runPdfToPng?: RunPdfToPng;
  runId?: string;
  resolveOutputConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  signal?: AbortSignal;
}

const avifEncoder: RasterEncoder<AvifOutputOptions> = async (sourceBuffer, outputPath, output) => {
  await sharp(sourceBuffer)
    .avif({ effort: output?.effort ?? 4 })
    .toFile(outputPath);
};

export async function convertToAvifFiles(options: ConvertToAvifFilesOptions): Promise<CommittedConversionOutput[]> {
  return convertRasterFiles({
    ...options,
    source: options.drawio,
    output: options.avif,
    definition: {
      operationName: 'convert-to-avif',
      stagingDirectoryName: 'convert-to-avif',
      resultExtension: 'avif',
      encoder: avifEncoder,
      unsupportedInputMessage: (sourcePath) => `Unsupported input for AVIF conversion: ${sourcePath}`,
    },
  });
}
