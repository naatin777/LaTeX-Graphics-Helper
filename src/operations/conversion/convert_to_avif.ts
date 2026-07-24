import {
  type CommittedConversionOutput,
  convertRasterFiles,
  type DrawioOptions,
  type RasterConversionDefinition,
  type RasterJob,
  type RunPdfToPng,
} from './raster_conversion.js';
import { openRasterInput } from './raster_input.js';
import { DEFAULT_MAX_INPUT_PIXELS } from '../../config/raster_input.js';
import type { MermaidPuppeteerOptions } from './convert_to_pdf.js';
import type { ConversionRuntime } from '../lifecycle/conversion_runtime.js';
import { type PdfToolScratchOptions } from '../external_tools/run_pdftocairo_with_ascii_scratch.js';

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
  ghostscriptPath: string;
  mermaid: MermaidPuppeteerOptions;
  drawio: DrawioToAvifOptions;
  avif: AvifOutputOptions;
  runPdfToPng?: RunPdfToPng | undefined;
  maxInputPixels?: number;
  runId?: string | undefined;
}

export async function convertToAvifFiles(options: ConvertToAvifFilesOptions): Promise<CommittedConversionOutput[]> {
  const definition: RasterConversionDefinition = {
    operationName: 'convert-to-avif',
    stagingDirectoryName: 'convert-to-avif',
    resultExtension: 'avif',
    encoder: async (sourcePath, outputPath, maxInputPixels, page) => {
      await openRasterInput(sourcePath, maxInputPixels, page).avif({ effort: options.avif.effort }).toFile(outputPath);
    },
    unsupportedInputMessage: (sourcePath) => `Unsupported input for AVIF conversion: ${sourcePath}`,
  };

  return convertRasterFiles({
    ...options,
    maxInputPixels: options.maxInputPixels ?? DEFAULT_MAX_INPUT_PIXELS,
    definition,
  });
}
