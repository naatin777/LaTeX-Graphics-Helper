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

export type ConvertToPngJob = RasterJob;
export type DrawioToPngOptions = DrawioOptions;
export type { RunPdfToPng };

export interface ConvertToPngFilesOptions extends PdfToolScratchOptions {
  jobs: ConvertToPngJob[];
  runtime: ConversionRuntime;
  pdftocairoPath: string;
  ghostscriptPath: string;
  mermaid: MermaidPuppeteerOptions;
  drawio: DrawioToPngOptions;
  runPdfToPng?: RunPdfToPng | undefined;
  runId?: string | undefined;
  maxInputPixels?: number;
}

const pngDefinition: RasterConversionDefinition = {
  operationName: 'convert-to-png',
  stagingDirectoryName: 'convert-to-png',
  resultExtension: 'png',
  encoder: async (sourcePath, outputPath, maxInputPixels, page) => {
    await openRasterInput(sourcePath, maxInputPixels, page).png().toFile(outputPath);
  },
  unsupportedInputMessage: (sourcePath) => `Unsupported input for PNG conversion: ${sourcePath}`,
};

export async function convertToPngFiles(options: ConvertToPngFilesOptions): Promise<CommittedConversionOutput[]> {
  return convertRasterFiles({
    ...options,
    maxInputPixels: options.maxInputPixels ?? DEFAULT_MAX_INPUT_PIXELS,
    definition: pngDefinition,
  });
}
