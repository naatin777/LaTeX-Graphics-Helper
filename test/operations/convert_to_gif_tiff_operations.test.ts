import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import sharp from 'sharp';

import { convertToGifFiles } from '../../src/operations/conversion/convert_to_gif.js';
import { convertToTiffFiles } from '../../src/operations/conversion/convert_to_tiff.js';

suite('GIF/TIFFに変換する処理', () => {
  test('各フレームを独立した静止GIF/TIFFとしてstaging lifecycleで出力する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-gif-tiff-operation-'));

    try {
      const sourcePath = path.join(workspacePath, 'source.gif');
      await writeAnimatedGif(sourcePath);
      const common = {
        pdftocairoTools: { pdftocairoPath: 'pdftocairo' },
        ghostscriptTools: { ghostscriptPath: 'gs' },
        mermaidTools: { browserChannel: 'chrome', theme: 'default', backgroundColor: 'white' },
        drawioTools: { drawioPath: 'drawio' },
        runtime: {},
      };

      for (const [format, convert] of [
        ['gif', convertToGifFiles],
        ['tiff', convertToTiffFiles],
      ] as const) {
        const outputPaths = [1, 2].map((page) => path.join(workspacePath, `${format}-${page}.${format}`));
        await convert({
          ...common,
          jobs: outputPaths.map((outputPath, index) => ({ sourcePath, outputPath, workspacePath, page: index + 1 })),
          runId: `test-${format}`,
        });

        for (const outputPath of outputPaths) {
          const metadata = await sharp(await readFile(outputPath)).metadata();
          assert.strictEqual(metadata.format, format);
          assert.strictEqual(metadata.pages ?? 1, 1);
        }
      }
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });
});

async function writeAnimatedGif(filePath: string): Promise<void> {
  const frames = await Promise.all([
    sharp({ create: { width: 4, height: 4, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } } })
      .png()
      .toBuffer(),
    sharp({ create: { width: 4, height: 4, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 1 } } })
      .png()
      .toBuffer(),
  ]);
  await sharp(frames, { join: { animated: true } })
    .gif()
    .toFile(filePath);
}
