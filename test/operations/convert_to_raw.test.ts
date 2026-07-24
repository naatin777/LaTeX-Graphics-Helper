import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import sharp from 'sharp';

import { convertToRawFiles } from '../../src/operations/conversion/convert_to_raw.js';

suite('Raw pixels conversion', () => {
  test('必須sidecarを使い、rawとsidecarを同じbatchでcommitする', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-raw-'));
    try {
      const sourcePath = path.join(workspacePath, 'source.raw');
      const outputPath = path.join(workspacePath, 'output.raw');
      const sidecar = {
        version: 1,
        width: 2,
        height: 1,
        channels: 3,
        depth: 'uchar',
        colourspace: 'srgb',
        alpha: false,
        layout: 'interleaved',
      };
      await writeFile(sourcePath, Buffer.from([255, 0, 0, 0, 255, 0]));
      await writeFile(`${sourcePath}.json`, `${JSON.stringify(sidecar)}\n`);

      const outputs = await convertToRawFiles({
        jobs: [{ sourcePath, outputPath, workspacePath }],
        runtime: { resolveConflicts: async () => 'overwrite' },
        runId: 'test-run',
      });

      assert.deepStrictEqual(
        outputs.map((output) => output.outputPath).sort(),
        [outputPath, `${outputPath}.json`].sort(),
      );
      assert.deepStrictEqual(await readFile(outputPath), Buffer.from([255, 0, 0, 0, 255, 0]));
      assert.deepStrictEqual(JSON.parse(await readFile(`${outputPath}.json`, 'utf8')), sidecar);
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('sidecarがなければ最終出力を作らない', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-raw-'));
    try {
      const sourcePath = path.join(workspacePath, 'source.raw');
      const outputPath = path.join(workspacePath, 'output.raw');
      await writeFile(sourcePath, Buffer.from([0]));

      await assert.rejects(
        convertToRawFiles({
          jobs: [{ sourcePath, outputPath, workspacePath }],
          runtime: { resolveConflicts: async () => 'overwrite' },
        }),
        /ENOENT|Invalid Raw sidecar|no such file/i,
      );
      await assert.rejects(access(outputPath));
      await assert.rejects(access(`${outputPath}.json`));
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('通常の画像入力からsidecar付きrawを生成する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-raw-'));
    try {
      const sourcePath = path.join(workspacePath, 'source.png');
      const outputPath = path.join(workspacePath, 'output.raw');
      await sharp({ create: { width: 2, height: 1, channels: 3, background: '#ff0000' } })
        .png()
        .toFile(sourcePath);

      await convertToRawFiles({
        jobs: [{ sourcePath, outputPath, workspacePath }],
        runtime: { resolveConflicts: async () => 'overwrite' },
      });

      assert.deepStrictEqual(JSON.parse(await readFile(`${outputPath}.json`, 'utf8')), {
        version: 1,
        width: 2,
        height: 1,
        channels: 3,
        depth: 'uchar',
        colourspace: 'srgb',
        alpha: false,
        layout: 'interleaved',
      });
      assert.strictEqual((await readFile(outputPath)).length, 6);
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });
});
