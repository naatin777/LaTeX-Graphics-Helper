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

export type ConvertToJpegJob = RasterJob;
export type DrawioToJpegOptions = DrawioOptions;
export type { RunPdfToPng };

export interface ConvertToJpegFilesOptions extends PdfToolScratchOptions {
  jobs: ConvertToJpegJob[];
  runtime: ConversionRuntime;
  pdftocairoPath: string;
  mermaid: MermaidPuppeteerOptions;
  drawio: DrawioToJpegOptions;
  runPdfToPng?: RunPdfToPng | undefined;
  runId?: string | undefined;
}

const jpegDefinition: RasterConversionDefinition = {
  operationName: 'convert-to-jpeg',
  stagingDirectoryName: 'convert-to-jpeg',
  resultExtension: 'jpeg',
  encoder: (sourceBuffer, outputPath) =>
    sharp(sourceBuffer)
      .jpeg()
      .toFile(outputPath)
      .then(() => undefined),
  unsupportedInputMessage: (sourcePath) => `Unsupported input for JPEG conversion: ${sourcePath}`,
};

export async function convertToJpegFiles(options: ConvertToJpegFilesOptions): Promise<CommittedConversionOutput[]> {
  return convertRasterFiles({ ...options, definition: jpegDefinition });
}
