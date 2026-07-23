import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import sharp, { type Sharp } from 'sharp';

// Path-backed inputs must not remain open in libvips's file cache on Windows.
sharp.cache({ files: 0 });

export type RasterInput = Sharp;

export interface RasterAnimationMetadata {
  pages: number;
  pageHeight: number;
  delay?: number[];
  loop?: number;
}

export interface RawSidecar {
  width: number;
  height: number;
  channels: 1 | 2 | 3 | 4;
}

export function openRasterInput(
  sourcePath: string,
  maxInputPixels: number,
  page?: number,
  animated = false,
): RasterInput {
  if (path.extname(sourcePath).toLowerCase() === '.raw') {
    return sharp(readFileSync(sourcePath), {
      limitInputPixels: maxInputPixels,
      failOn: 'warning',
      raw: readRawSidecar(sourcePath),
    });
  }

  const inputOptions: Parameters<typeof sharp>[1] = {
    limitInputPixels: maxInputPixels,
    failOn: 'warning',
  };
  if (page !== undefined) {
    inputOptions.page = page - 1;
    inputOptions.pages = 1;
  } else if (animated) {
    inputOptions.animated = true;
  }
  return sharp(sourcePath, inputOptions);
}

export async function readRasterAnimationMetadata(
  sourcePath: string,
  maxInputPixels: number,
): Promise<RasterAnimationMetadata | undefined> {
  const image = openRasterInput(sourcePath, maxInputPixels, undefined, true);

  try {
    const metadata = await image.metadata();
    const pages = metadata.pages ?? 1;
    const pageHeight = metadata.pageHeight ?? metadata.height;
    if (!Number.isInteger(pages) || pages < 1 || !Number.isInteger(pageHeight) || pageHeight < 1) {
      throw new Error(`Could not determine image animation metadata: ${sourcePath}`);
    }
    if (pages <= 1) {
      return undefined;
    }

    const result: RasterAnimationMetadata = {
      pages,
      pageHeight,
    };
    if (metadata.delay !== undefined) {
      result.delay = metadata.delay;
    }
    if (metadata.loop !== undefined) {
      result.loop = metadata.loop;
    }
    return result;
  } finally {
    await destroyRasterInput(image);
  }
}

export function readRawSidecar(sourcePath: string): RawSidecar {
  const sidecarPath = `${sourcePath}.json`;
  let value: unknown;

  try {
    value = JSON.parse(readFileSync(sidecarPath, 'utf8')) as unknown;
  } catch (error) {
    throw new Error(`Invalid Raw sidecar: ${sidecarPath}`, { cause: error });
  }

  if (typeof value !== 'object' || value === null) {
    throw new Error(`Invalid Raw sidecar: ${sidecarPath}`);
  }

  const candidate = value as Record<string, unknown>;
  if (
    !isPositiveInteger(candidate.width) ||
    !isPositiveInteger(candidate.height) ||
    (candidate.channels !== 1 && candidate.channels !== 2 && candidate.channels !== 3 && candidate.channels !== 4)
  ) {
    throw new Error(`Invalid Raw sidecar: ${sidecarPath}; expected positive width, height, and channels 1-4.`);
  }

  return { width: candidate.width, height: candidate.height, channels: candidate.channels };
}

export function rawByteLength(sidecar: RawSidecar): number {
  const byteLength = sidecar.width * sidecar.height * sidecar.channels;
  if (!Number.isSafeInteger(byteLength)) {
    throw new Error('Raw sidecar dimensions produce an unsafe byte length.');
  }
  return byteLength;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
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
