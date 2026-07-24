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

export type ConvertToTiffJob = RasterJob;
export type DrawioToTiffOptions = DrawioOptions;
export type { RunPdfToPng };

export interface ConvertToTiffFilesOptions extends PdfToolScratchOptions {
  jobs: ConvertToTiffJob[];
  runtime: ConversionRuntime;
  pdftocairoPath: string;
  ghostscriptPath: string;
  mermaid: MermaidPuppeteerOptions;
  drawio: DrawioToTiffOptions;
  runPdfToPng?: RunPdfToPng | undefined;
  runId?: string | undefined;
  maxInputPixels?: number;
}

const tiffDefinition: RasterConversionDefinition = {
  operationName: 'convert-to-tiff',
  stagingDirectoryName: 'convert-to-tiff',
  resultExtension: 'tiff',
  encoder: async (sourcePath, outputPath, maxInputPixels, page) => {
    await openRasterInput(sourcePath, maxInputPixels, page).tiff().toFile(outputPath);
  },
  unsupportedInputMessage: (sourcePath) => `Unsupported input for TIFF conversion: ${sourcePath}`,
};

export async function convertToTiffFiles(options: ConvertToTiffFilesOptions): Promise<CommittedConversionOutput[]> {
  return convertRasterFiles({
    ...options,
    maxInputPixels: options.maxInputPixels ?? DEFAULT_MAX_INPUT_PIXELS,
    definition: tiffDefinition,
  });
}
