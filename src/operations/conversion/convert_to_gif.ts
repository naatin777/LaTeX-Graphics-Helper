import {
  type CommittedConversionOutput,
  convertRasterFiles,
  type RasterConversionDefinition,
  type RasterJob,
} from './raster_conversion.js';
import { openRasterInput } from './raster_input.js';
import { DEFAULT_MAX_INPUT_PIXELS } from '../../config/raster_input.js';
import type { ConversionRuntime } from '../lifecycle/conversion_runtime.js';
import type { DrawioTools } from './tools/drawio_tools.js';
import type { GhostscriptTools } from './tools/ghostscript_tools.js';
import type { MermaidTools } from './tools/mermaid_tools.js';
import type { PdftocairoTools } from './tools/pdftocairo_tools.js';

export type ConvertToGifJob = RasterJob;

export interface ConvertToGifFilesOptions {
  jobs: ConvertToGifJob[];
  runtime: ConversionRuntime;
  pdftocairoTools: PdftocairoTools;
  ghostscriptTools: GhostscriptTools;
  mermaidTools: MermaidTools;
  drawioTools: DrawioTools;
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
