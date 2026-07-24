import assert from 'node:assert/strict';
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createRasterFrameJobs } from '../../src/commands/conversion/create_raster_frame_jobs.js';
import { DEFAULT_MAX_INPUT_PIXELS } from '../../src/config/raster_input.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(testDirectory, '..', '..', '..', 'test', 'fixtures', 'test.png');

suite('ラスター分割jobの出力path検証', () => {
  test('コマンドの許容拡張子と一致しないtemplateを変換前に拒否する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-frame-jobs-'));
    const sourcePath = path.join(workspacePath, 'source.png');

    try {
      await copyFile(fixturePath, sourcePath);
      await assert.rejects(
        createRasterFrameJobs({
          sourcePath,
          workspacePath,
          workspaceName: path.basename(workspacePath),
          outputTemplate: '${fileDirname}/${fileBasenameNoExtension}.jpeg',
          allowedExtensions: ['.png'],
          maxInputPixels: DEFAULT_MAX_INPUT_PIXELS,
          createJob: (job) => job,
        }),
        /Invalid output extension/,
      );
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('許容拡張子と一致するtemplateからjobを生成する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-frame-jobs-'));
    const sourcePath = path.join(workspacePath, 'source.png');

    try {
      await copyFile(fixturePath, sourcePath);
      const jobs = await createRasterFrameJobs({
        sourcePath,
        workspacePath,
        workspaceName: path.basename(workspacePath),
        outputTemplate: '${fileDirname}/${fileBasenameNoExtension}.png',
        allowedExtensions: ['.png'],
        maxInputPixels: DEFAULT_MAX_INPUT_PIXELS,
        createJob: (job) => job,
      });

      assert.strictEqual(jobs.length, 1);
      assert.strictEqual(path.extname(jobs[0]?.outputPath ?? ''), '.png');
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });
});
