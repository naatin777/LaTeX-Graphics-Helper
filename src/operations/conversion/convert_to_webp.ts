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

export type ConvertToWebpJob = RasterJob;

export interface WebpOutputOptions {
  effort: number;
}

export interface ConvertToWebpFilesOptions {
  jobs: ConvertToWebpJob[];
  runtime: ConversionRuntime;
  pdftocairoTools: PdftocairoTools;
  ghostscriptTools: GhostscriptTools;
  mermaidTools: MermaidTools;
  drawioTools: DrawioTools;
  webp: WebpOutputOptions;
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
