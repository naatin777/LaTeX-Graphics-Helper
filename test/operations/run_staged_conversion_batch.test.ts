import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { runStagedConversionBatch } from '../../src/operations/lifecycle/run_staged_conversion_batch.js';

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

  test('1件のstage失敗後も実行中のstageを待ってからcleanupする', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-staged-batch-'));
    const stagingRootPath = path.join(workspacePath, '.latex-graphics-helper', 'fixture-raster', 'abort-run');
    let resolveSecondStarted!: () => void;
    const secondStarted = new Promise<void>((resolve) => {
      resolveSecondStarted = resolve;
    });
    let thirdStarted = false;
    let releaseSecond!: () => void;
    const secondFinished = new Promise<void>((resolve) => {
      releaseSecond = resolve;
    });
    let batch: Promise<unknown> | undefined;

    try {
      batch = runStagedConversionBatch({
        jobs: [{ workspacePath }, { workspacePath }, { workspacePath }],
        operationName: 'fixture-raster',
        runId: 'abort-run',
        stage: async (_job, index) => {
          await mkdir(stagingRootPath, { recursive: true });

          if (index === 0) {
            await writeFile(path.join(stagingRootPath, 'first'), 'partial');
            throw new Error('injected stage failure');
          }

          if (index === 1) {
            await writeFile(path.join(stagingRootPath, 'second'), 'in progress');
            resolveSecondStarted();
            await secondFinished;
            throw new Error('second stage stopped');
          }

          thirdStarted = true;
          throw new Error('queued stage should not start');
        },
      });

      await Promise.race([
        secondStarted,
        new Promise<never>((_resolve, reject) =>
          setTimeout(() => reject(new Error('second stage did not start')), 1000),
        ),
      ]);
      assert.strictEqual(thirdStarted, false);
      await assert.doesNotReject(access(path.join(stagingRootPath, 'second')));
      releaseSecond();

      await assert.rejects(batch, /injected stage failure/);
      await assert.rejects(access(stagingRootPath));
    } finally {
      releaseSecond();
      await batch?.catch(() => undefined);
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('caller cancellationでも実行中のstageがsettleするまでcleanupせず、queueを開始しない', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-staged-batch-'));
    const stagingRootPath = path.join(workspacePath, '.latex-graphics-helper', 'fixture-raster', 'caller-abort-run');
    const abortController = new AbortController();
    let startedStages = 0;
    let queuedStageStarted = false;
    let resolveBothStarted!: () => void;
    const bothStarted = new Promise<void>((resolve) => {
      resolveBothStarted = resolve;
    });
    let releaseStages!: () => void;
    const stagesReleased = new Promise<void>((resolve) => {
      releaseStages = resolve;
    });
    let batch: Promise<unknown> | undefined;

    try {
      batch = runStagedConversionBatch({
        jobs: [{ workspacePath }, { workspacePath }, { workspacePath }],
        operationName: 'fixture-raster',
        runId: 'caller-abort-run',
        runtime: { signal: abortController.signal },
        stage: async (_job, index, _runId, runtime) => {
          if (index >= 2) {
            queuedStageStarted = true;
            throw new Error('queued stage should not start');
          }

          await mkdir(stagingRootPath, { recursive: true });
          await writeFile(path.join(stagingRootPath, `job-${index}`), 'in progress');
          startedStages++;
          if (startedStages === 2) {
            resolveBothStarted();
          }

          await stagesReleased;
          runtime.signal?.throwIfAborted();
          throw new Error('delayed sibling stage should stop');
        },
      });

      await Promise.race([
        bothStarted,
        new Promise<never>((_resolve, reject) =>
          setTimeout(() => reject(new Error('both stages did not start')), 1000),
        ),
      ]);
      abortController.abort();
      await new Promise<void>((resolve) => setImmediate(resolve));

      assert.strictEqual(queuedStageStarted, false);
      await assert.doesNotReject(access(path.join(stagingRootPath, 'job-1')));

      releaseStages();
      await assert.rejects(batch, { name: 'AbortError' });
      await assert.rejects(access(stagingRootPath));
    } finally {
      releaseStages();
      await batch?.catch(() => undefined);
      await rm(workspacePath, { recursive: true, force: true });
    }
  });
});
