import assert from 'node:assert/strict';
import { mkdtemp, rename, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import sharp from 'sharp';

import { runPreflightBatch } from '../../src/operations/input/input_preflight.js';

suite('Raster preflight file handle', () => {
  test('WebP検査後すぐに入力ファイルを移動できる', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'lgh-preflight-handle-'));

    try {
      const sourcePath = path.join(directory, 'source.webp');
      const movedPath = path.join(directory, 'moved.webp');
      await sharp({
        create: {
          width: 4,
          height: 4,
          channels: 4,
          background: { r: 32, g: 64, b: 96, alpha: 1 },
        },
      })
        .webp()
        .toFile(sourcePath);

      const result = await runPreflightBatch([sourcePath]);
      assert.strictEqual(result.canProceed, true);
      await rename(sourcePath, movedPath);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
