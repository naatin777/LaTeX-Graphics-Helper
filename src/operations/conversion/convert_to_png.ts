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

export type ConvertToPngJob = RasterJob;

export interface ConvertToPngFilesOptions {
  jobs: ConvertToPngJob[];
  runtime: ConversionRuntime;
  pdftocairoTools: PdftocairoTools;
  ghostscriptTools: GhostscriptTools;
  mermaidTools: MermaidTools;
  drawioTools: DrawioTools;
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
