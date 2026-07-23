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

export type ConvertToGifJob = RasterJob;
export type DrawioToGifOptions = DrawioOptions;
export type { RunPdfToPng };

export interface ConvertToGifFilesOptions extends PdfToolScratchOptions {
  jobs: ConvertToGifJob[];
  runtime: ConversionRuntime;
  pdftocairoPath: string;
  ghostscriptPath: string;
  mermaid: MermaidPuppeteerOptions;
  drawio: DrawioToGifOptions;
  runPdfToPng?: RunPdfToPng | undefined;
  runId?: string | undefined;
  maxInputPixels?: number;
}

const gifDefinition: RasterConversionDefinition = {
  operationName: 'convert-to-gif',
  stagingDirectoryName: 'convert-to-gif',
  resultExtension: 'gif',
  encoder: async (sourcePath, outputPath, maxInputPixels, page, animation) => {
    const outputOptions: { delay?: number[]; loop?: number } = {};
    if (animation?.delay !== undefined) {
      outputOptions.delay = animation.delay;
    }
    if (animation?.loop !== undefined) {
      outputOptions.loop = animation.loop;
    }
    await openRasterInput(sourcePath, maxInputPixels, page, animation !== undefined)
      .gif(outputOptions)
      .toFile(outputPath);
  },
  unsupportedInputMessage: (sourcePath) => `Unsupported input for GIF conversion: ${sourcePath}`,
};

export async function convertToGifFiles(options: ConvertToGifFilesOptions): Promise<CommittedConversionOutput[]> {
  return convertRasterFiles({
    ...options,
    maxInputPixels: options.maxInputPixels ?? DEFAULT_MAX_INPUT_PIXELS,
    definition: gifDefinition,
  });
}
