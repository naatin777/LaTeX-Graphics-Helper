import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import sharp from 'sharp';
import * as vscode from 'vscode';

const execFileAsync = promisify(execFile);

export interface PdfPageVisualComparison {
  expectedPdfPath: string;
  expectedPageNumber: number;
  actualPdfPath: string;
  actualPageNumber: number;
  renderDirectory: string;
  renderPrefix: string;
  dpi?: number;
}

export async function assertRenderedPdfPagesSimilar(comparison: PdfPageVisualComparison): Promise<void> {
  const dpi = comparison.dpi ?? 144;
  await mkdir(comparison.renderDirectory, { recursive: true });

  const expectedPngPath = await renderPdfPage(
    comparison.expectedPdfPath,
    comparison.expectedPageNumber,
    path.join(comparison.renderDirectory, `${comparison.renderPrefix}-expected`),
    dpi,
  );
  const actualPngPath = await renderPdfPage(
    comparison.actualPdfPath,
    comparison.actualPageNumber,
    path.join(comparison.renderDirectory, `${comparison.renderPrefix}-actual`),
    dpi,
  );

  await assertPngsSimilar(await readFile(expectedPngPath), await readFile(actualPngPath));
}

async function renderPdfPage(pdfPath: string, pageNumber: number, outputPrefix: string, dpi: number): Promise<string> {
  const pdftocairoPath = vscode.workspace
    .getConfiguration('latex-graphics-helper')
    .get<string>('execPath.pdftocairo', 'pdftocairo');

  await execFileAsync(pdftocairoPath, [
    '-png',
    '-singlefile',
    '-f',
    pageNumber.toString(),
    '-l',
    pageNumber.toString(),
    '-r',
    dpi.toString(),
    pdfPath,
    outputPrefix,
  ]);

  return `${outputPrefix}.png`;
}

async function assertPngsSimilar(expectedPng: Buffer, actualPng: Buffer): Promise<void> {
  const [expected, actual] = await Promise.all([
    sharp(expectedPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(actualPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);

  assert.strictEqual(actual.info.width, expected.info.width);
  assert.strictEqual(actual.info.height, expected.info.height);
  assert.strictEqual(actual.info.channels, expected.info.channels);

  const exactDifference = calculatePixelDifference(expected, actual, 0, 0);
  const shiftedDifferences = [
    calculatePixelDifference(expected, actual, -1, -1),
    calculatePixelDifference(expected, actual, 0, -1),
    calculatePixelDifference(expected, actual, 1, -1),
    calculatePixelDifference(expected, actual, -1, 0),
    calculatePixelDifference(expected, actual, 1, 0),
    calculatePixelDifference(expected, actual, -1, 1),
    calculatePixelDifference(expected, actual, 0, 1),
    calculatePixelDifference(expected, actual, 1, 1),
  ];
  const closestShiftDifference = Math.min(
    ...shiftedDifferences.map(({ meanChannelDifference }) => meanChannelDifference),
  );

  assert.ok(
    exactDifference.differentPixelRatio <= 0.003,
    `Rendered PDF pixel mismatch ratio was ${exactDifference.differentPixelRatio}.`,
  );
  assert.ok(
    exactDifference.meanChannelDifference <= 0.1,
    `Rendered PDF mean channel difference was ${exactDifference.meanChannelDifference}.`,
  );
  assert.ok(
    exactDifference.meanChannelDifference * 5 < closestShiftDifference,
    `Rendered PDF content is closer to a one-pixel shift (${closestShiftDifference}) than the expected position (${exactDifference.meanChannelDifference}).`,
  );
}

function calculatePixelDifference(
  expected: RawImage,
  actual: RawImage,
  offsetX: number,
  offsetY: number,
): { differentPixelRatio: number; meanChannelDifference: number } {
  let comparedPixels = 0;
  let differentPixels = 0;
  let totalDifference = 0;
  const channels = expected.info.channels;

  for (let expectedY = 0; expectedY < expected.info.height; expectedY += 1) {
    for (let expectedX = 0; expectedX < expected.info.width; expectedX += 1) {
      const actualX = expectedX + offsetX;
      const actualY = expectedY + offsetY;

      if (actualX < 0 || actualY < 0 || actualX >= actual.info.width || actualY >= actual.info.height) {
        continue;
      }

      let maximumChannelDifference = 0;

      for (let channelIndex = 0; channelIndex < channels; channelIndex += 1) {
        const expectedIndex = (expectedY * expected.info.width + expectedX) * channels + channelIndex;
        const actualIndex = (actualY * actual.info.width + actualX) * channels + channelIndex;
        const difference = Math.abs((expected.data[expectedIndex] ?? 0) - (actual.data[actualIndex] ?? 0));
        maximumChannelDifference = Math.max(maximumChannelDifference, difference);
        totalDifference += difference;
      }

      if (maximumChannelDifference > 8) {
        differentPixels += 1;
      }
      comparedPixels += 1;
    }
  }

  return {
    differentPixelRatio: differentPixels / comparedPixels,
    meanChannelDifference: totalDifference / (comparedPixels * channels),
  };
}

interface RawImage {
  data: Uint8Array;
  info: {
    width: number;
    height: number;
    channels: number;
  };
}
