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

export type ConvertToAvifJob = RasterJob;

export interface AvifOutputOptions {
  effort: number;
}

export interface ConvertToAvifFilesOptions {
  jobs: ConvertToAvifJob[];
  runtime: ConversionRuntime;
  pdftocairoTools: PdftocairoTools;
  ghostscriptTools: GhostscriptTools;
  mermaidTools: MermaidTools;
  drawioTools: DrawioTools;
  avif: AvifOutputOptions;
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
