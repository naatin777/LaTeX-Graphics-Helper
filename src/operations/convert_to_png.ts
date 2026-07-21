import sharp from 'sharp';

import {
  type CommittedConversionOutput,
  convertRasterFiles,
  type DrawioOptions,
  type RasterConversionDefinition,
  type RasterJob,
  type RunPdfToPng,
} from './raster_conversion.js';
import type { MermaidPuppeteerOptions } from './convert_png_to_pdf.js';
import type { ConversionRuntime } from './conversion_runtime.js';
import { type PdfToolScratchOptions } from './run_pdftocairo_with_ascii_scratch.js';

export type ConvertToPngJob = RasterJob;
export type DrawioToPngOptions = DrawioOptions;
export type { RunPdfToPng };

export interface ConvertToPngFilesOptions extends PdfToolScratchOptions {
  jobs: ConvertToPngJob[];
  runtime: ConversionRuntime;
  pdftocairoPath: string;
  mermaid: MermaidPuppeteerOptions;
  drawio: DrawioToPngOptions;
  runPdfToPng?: RunPdfToPng | undefined;
  runId?: string | undefined;
}

const pngDefinition: RasterConversionDefinition = {
  operationName: 'convert-to-png',
  stagingDirectoryName: 'convert-to-png',
  resultExtension: 'png',
  encoder: async (sourceBuffer, outputPath) => {
    await sharp(sourceBuffer).png().toFile(outputPath);
  },
  unsupportedInputMessage: (sourcePath) => `Unsupported input for PNG conversion: ${sourcePath}`,
};

export async function convertToPngFiles(options: ConvertToPngFilesOptions): Promise<CommittedConversionOutput[]> {
  return convertRasterFiles({ ...options, definition: pngDefinition });
}
