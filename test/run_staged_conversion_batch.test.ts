/* oxlint-disable vitest/expect-expect */

import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { runStagedConversionBatch } from '../src/operations/run_staged_conversion_batch.js';

suite('staged conversion batch', () => {
  test('成功時はcommit後もUndo登録前のoperation artifactを保持する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-staged-batch-'));
    const outputPath = path.join(workspacePath, 'result.png');
    const stagingRootPath = path.join(workspacePath, '.latex-graphics-helper', 'fixture-raster', 'run');
    const stagedOutputPath = path.join(stagingRootPath, 'result.png');

    try {
      const outputs = await runStagedConversionBatch({
        jobs: [{ workspacePath }],
        operationName: 'fixture-raster',
        runId: 'run',
        stage: async () => {
          await mkdir(stagingRootPath, { recursive: true });
          await writeFile(stagedOutputPath, 'raster result');
          return { stagedOutputPath, outputPath, workspacePath, stagingRootPath };
        },
      });

      assert.strictEqual(outputs[0]?.outputPath, outputPath);
      assert.strictEqual(await readFile(outputPath, 'utf8'), 'raster result');
      assert.strictEqual(await readFile(stagedOutputPath, 'utf8'), 'raster result');
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('stage失敗時は正しいoperation rootだけをcleanupし、最終出力を作らない', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-staged-batch-'));
    const outsidePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-staged-batch-outside-'));
    const outputPath = path.join(workspacePath, 'result.png');
    const stagingRootPath = path.join(workspacePath, '.latex-graphics-helper', 'fixture-raster', 'failed-run');
    const stagedOutputPath = path.join(stagingRootPath, 'result.png');
    const outsideFilePath = path.join(outsidePath, 'keep.txt');

    try {
      await writeFile(outsideFilePath, 'keep');

      await assert.rejects(
        runStagedConversionBatch({
          jobs: [{ workspacePath }],
          operationName: 'fixture-raster',
          runId: 'failed-run',
          stage: async () => {
            await mkdir(stagingRootPath, { recursive: true });
            await writeFile(stagedOutputPath, 'partial result');
            throw new Error('injected stage failure');
          },
        }),
        /injected stage failure/,
      );

      await assert.rejects(access(stagedOutputPath));
      await assert.rejects(access(outputPath));
      assert.strictEqual(await readFile(outsideFilePath, 'utf8'), 'keep');
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
      await rm(outsidePath, { recursive: true, force: true });
    }
  });
});
