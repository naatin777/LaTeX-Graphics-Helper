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

export type ConvertToAvifJob = RasterJob;
export type DrawioToAvifOptions = DrawioOptions;
export type { RunPdfToPng };

export interface AvifOutputOptions {
  effort: number;
}

export interface ConvertToAvifFilesOptions extends PdfToolScratchOptions {
  jobs: ConvertToAvifJob[];
  runtime: ConversionRuntime;
  pdftocairoPath: string;
  mermaid: MermaidPuppeteerOptions;
  drawio: DrawioToAvifOptions;
  avif: AvifOutputOptions;
  runPdfToPng?: RunPdfToPng | undefined;
  runId?: string | undefined;
}

export async function convertToAvifFiles(options: ConvertToAvifFilesOptions): Promise<CommittedConversionOutput[]> {
  const definition: RasterConversionDefinition = {
    operationName: 'convert-to-avif',
    stagingDirectoryName: 'convert-to-avif',
    resultExtension: 'avif',
    encoder: async (sourceBuffer, outputPath) => {
      await sharp(sourceBuffer).avif({ effort: options.avif.effort }).toFile(outputPath);
    },
    unsupportedInputMessage: (sourcePath) => `Unsupported input for AVIF conversion: ${sourcePath}`,
  };

  return convertRasterFiles({ ...options, definition });
}
