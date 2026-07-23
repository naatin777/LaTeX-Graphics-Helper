import { once } from 'node:events';

import sharp, { type Sharp } from 'sharp';

// Path-backed inputs must not remain open in libvips's file cache on Windows.
sharp.cache({ files: 0 });

export type RasterInput = Sharp;

export function openRasterInput(sourcePath: string, maxInputPixels: number): RasterInput {
  return sharp(sourcePath, {
    limitInputPixels: maxInputPixels,
    failOn: 'warning',
  });
}

export async function destroyRasterInput(image: RasterInput): Promise<void> {
  if (image.destroyed) {
    return;
  }

  const closed = once(image, 'close');
  image.destroy();
  await closed;
}

export function isRasterInputPixelLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /(?:pixel|pixels).{0,40}(?:limit|maximum)|(?:limit|maximum).{0,40}(?:pixel|pixels)/iu.test(message);
}

export function rasterInputPixelLimitMessage(
  maxInputPixels: number,
  dimensions?: { width: number; height: number },
): string {
  const lines = [
    'The image exceeds the configured raster input pixel limit.',
    '',
    `Configured limit: ${maxInputPixels.toLocaleString('en-US')} pixels`,
  ];

  if (dimensions !== undefined) {
    lines.push(
      '',
      `Image dimensions: ${dimensions.width} × ${dimensions.height}`,
      `Image pixels: ${(dimensions.width * dimensions.height).toLocaleString('en-US')}`,
    );
  }

  lines.push('', 'Reduce the image dimensions or increase', 'latex-graphics-helper.raster.maxInputPixels.');
  return lines.join('\n');
}
