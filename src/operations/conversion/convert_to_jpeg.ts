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

export type ConvertToJpegJob = RasterJob;
export type DrawioToJpegOptions = DrawioOptions;
export type { RunPdfToPng };

export interface ConvertToJpegFilesOptions extends PdfToolScratchOptions {
  jobs: ConvertToJpegJob[];
  runtime: ConversionRuntime;
  pdftocairoPath: string;
  ghostscriptPath: string;
  mermaid: MermaidPuppeteerOptions;
  drawio: DrawioToJpegOptions;
  runPdfToPng?: RunPdfToPng | undefined;
  runId?: string | undefined;
  maxInputPixels?: number;
}

const jpegDefinition: RasterConversionDefinition = {
  operationName: 'convert-to-jpeg',
  stagingDirectoryName: 'convert-to-jpeg',
  resultExtension: 'jpeg',
  encoder: async (sourcePath, outputPath, maxInputPixels) => {
    await openRasterInput(sourcePath, maxInputPixels).jpeg().toFile(outputPath);
  },
  unsupportedInputMessage: (sourcePath) => `Unsupported input for JPEG conversion: ${sourcePath}`,
};

export async function convertToJpegFiles(options: ConvertToJpegFilesOptions): Promise<CommittedConversionOutput[]> {
  return convertRasterFiles({
    ...options,
    maxInputPixels: options.maxInputPixels ?? DEFAULT_MAX_INPUT_PIXELS,
    definition: jpegDefinition,
  });
}
