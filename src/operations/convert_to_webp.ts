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

export type ConvertToWebpJob = RasterJob;
export type DrawioToWebpOptions = DrawioOptions;
export type { RunPdfToPng };

export interface WebpOutputOptions {
  effort: number;
}

export interface ConvertToWebpFilesOptions extends PdfToolScratchOptions {
  jobs: ConvertToWebpJob[];
  runtime: ConversionRuntime;
  pdftocairoPath: string;
  mermaid: MermaidPuppeteerOptions;
  drawio: DrawioToWebpOptions;
  webp: WebpOutputOptions;
  runPdfToPng?: RunPdfToPng | undefined;
  runId?: string | undefined;
}

export async function convertToWebpFiles(options: ConvertToWebpFilesOptions): Promise<CommittedConversionOutput[]> {
  const definition: RasterConversionDefinition = {
    operationName: 'convert-to-webp',
    stagingDirectoryName: 'convert-to-webp',
    resultExtension: 'webp',
    encoder: async (sourceBuffer, outputPath) => {
      await sharp(sourceBuffer).webp({ effort: options.webp.effort }).toFile(outputPath);
    },
    unsupportedInputMessage: (sourcePath) => `Unsupported input for WebP conversion: ${sourcePath}`,
  };

  return convertRasterFiles({ ...options, definition });
}
