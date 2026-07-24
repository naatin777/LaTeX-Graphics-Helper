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

export type ConvertToTiffJob = RasterJob;

export interface ConvertToTiffFilesOptions {
  jobs: ConvertToTiffJob[];
  runtime: ConversionRuntime;
  pdftocairoTools: PdftocairoTools;
  ghostscriptTools: GhostscriptTools;
  mermaidTools: MermaidTools;
  drawioTools: DrawioTools;
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
