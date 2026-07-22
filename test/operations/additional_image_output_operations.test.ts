import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

import { convertToPdfFiles } from '../../src/operations/conversion/convert_to_pdf.js';
import { convertToAvifFiles } from '../../src/operations/conversion/convert_to_avif.js';
import { convertToJpegFiles } from '../../src/operations/conversion/convert_to_jpeg.js';
import { convertToPngFiles } from '../../src/operations/conversion/convert_to_png.js';
import { convertToWebpFiles } from '../../src/operations/conversion/convert_to_webp.js';

const inputFormats = ['gif', 'tiff'] as const;
const outputFormats = ['pdf', 'png', 'jpeg', 'webp', 'avif'] as const;

suite('GIF/TIFFの出力経路', () => {
  test('GIF/TIFFを各supported outputへ変換し、先頭frame/pageだけを使う', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-additional-image-output-'));

    try {
      for (const inputFormat of inputFormats) {
        const sourcePath = path.join(workspacePath, `source.${inputFormat}`);
        await writeAnimatedImageFixture(sourcePath, inputFormat);

        for (const outputFormat of outputFormats) {
          const outputPath = path.join(workspacePath, `source-${inputFormat}.${outputFormat}`);
          await convertImage(inputFormat, outputFormat, sourcePath, outputPath, workspacePath);
          await assertFirstFrameOutput(outputFormat, outputPath);
        }
      }
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });
});

async function convertImage(
  inputFormat: (typeof inputFormats)[number],
  outputFormat: (typeof outputFormats)[number],
  sourcePath: string,
  outputPath: string,
  workspacePath: string,
): Promise<void> {
  const job = { sourcePath, outputPath, workspacePath };
  const runtime = { resolveConflicts: async (): Promise<'overwrite'> => 'overwrite' };

  if (outputFormat === 'pdf') {
    await convertToPdfFiles({
      jobs: [job],
      supportedExtensions: [`.${inputFormat}`],
      operationName: 'convert-additional-image-to-pdf',
    });
    return;
  }

  const common = {
    jobs: [job],
    pdftocairoPath: 'pdftocairo',
    ghostscriptPath: 'gs',
    mermaid: { browserChannel: 'chrome', theme: 'default', backgroundColor: 'white' },
    drawio: { drawioPath: 'drawio' },
    runtime,
    runId: `${inputFormat}-${outputFormat}`,
  };

  if (outputFormat === 'png') {
    await convertToPngFiles(common);
  } else if (outputFormat === 'jpeg') {
    await convertToJpegFiles(common);
  } else if (outputFormat === 'webp') {
    await convertToWebpFiles({ ...common, webp: { effort: 0 } });
  } else {
    await convertToAvifFiles({ ...common, avif: { effort: 0 } });
  }
}

async function writeAnimatedImageFixture(filePath: string, format: (typeof inputFormats)[number]): Promise<void> {
  const red = await sharp({
    create: {
      width: 4,
      height: 4,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  const blue = await sharp({
    create: {
      width: 4,
      height: 4,
      channels: 4,
      background: { r: 0, g: 0, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const output = sharp([red, blue], { join: { animated: true } });
  await (format === 'gif' ? output.gif() : output.tiff()).toFile(filePath);
}

async function assertFirstFrameOutput(outputFormat: (typeof outputFormats)[number], filePath: string): Promise<void> {
  if (outputFormat === 'pdf') {
    const document = await PDFDocument.load(await readFile(filePath));
    assert.strictEqual(document.getPageCount(), 1);
    const page = document.getPage(0);
    assert.strictEqual(page.getWidth(), 4);
    assert.strictEqual(page.getHeight(), 4);
    return;
  }

  const { data, info } = await sharp(await readFile(filePath))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.strictEqual(info.width, 4);
  assert.strictEqual(info.height, 4);
  assert.strictEqual(info.format, 'raw');

  for (let index = 0; index < data.length; index += 4) {
    assert.ok(data[index]! > 220);
    assert.ok(data[index + 1]! < 30);
    assert.ok(data[index + 2]! < 30);
  }
}
