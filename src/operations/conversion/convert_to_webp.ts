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
  ghostscriptPath: string;
  mermaid: MermaidPuppeteerOptions;
  drawio: DrawioToWebpOptions;
  webp: WebpOutputOptions;
  runPdfToPng?: RunPdfToPng | undefined;
  runId?: string | undefined;
  maxInputPixels?: number;
}

export async function convertToWebpFiles(options: ConvertToWebpFilesOptions): Promise<CommittedConversionOutput[]> {
  const definition: RasterConversionDefinition = {
    operationName: 'convert-to-webp',
    stagingDirectoryName: 'convert-to-webp',
    resultExtension: 'webp',
    encoder: async (sourcePath, outputPath, maxInputPixels, page, animation) => {
      const outputOptions: WebpOutputOptions & { delay?: number[]; loop?: number } = { effort: options.webp.effort };
      if (animation?.delay !== undefined) {
        outputOptions.delay = animation.delay;
      }
      if (animation?.loop !== undefined) {
        outputOptions.loop = animation.loop;
      }
      await openRasterInput(sourcePath, maxInputPixels, page, animation !== undefined)
        .webp(outputOptions)
        .toFile(outputPath);
    },
    unsupportedInputMessage: (sourcePath) => `Unsupported input for WebP conversion: ${sourcePath}`,
  };
  return convertRasterFiles({
    ...options,
    maxInputPixels: options.maxInputPixels ?? DEFAULT_MAX_INPUT_PIXELS,
    definition,
  });
}
