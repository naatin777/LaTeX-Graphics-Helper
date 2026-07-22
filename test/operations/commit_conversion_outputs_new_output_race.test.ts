import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  commitConversionOutputs,
  CommitRollbackError,
} from '../../src/operations/lifecycle/commit_conversion_outputs.js';

suite('変換結果rollbackの外部変更保護', () => {
  test('commit後に外部編集された新規出力を削除しない', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-new-output-race-'));
    const stagingRootPath = path.join(workspacePath, '.latex-graphics-helper', 'run');
    const firstStagedPath = path.join(stagingRootPath, 'first.pdf');
    const secondStagedPath = path.join(stagingRootPath, 'second.pdf');
    const firstOutputPath = path.join(workspacePath, 'first.pdf');
    const secondOutputPath = path.join(workspacePath, 'second.pdf');

    try {
      await mkdir(stagingRootPath, { recursive: true });
      await writeFile(firstStagedPath, 'generated first');
      await writeFile(secondStagedPath, 'generated second');
      let outputCopyCount = 0;

      await assert.rejects(
        commitConversionOutputs(
          [
            {
              stagedOutputPath: firstStagedPath,
              outputPath: firstOutputPath,
              workspacePath,
              stagingRootPath,
            },
            {
              stagedOutputPath: secondStagedPath,
              outputPath: secondOutputPath,
              workspacePath,
              stagingRootPath,
            },
          ],
          {
            copyFile: async (source, destination, flags) => {
              await copyFile(source, destination, flags);
              outputCopyCount += 1;

              if (outputCopyCount === 1) {
                await writeFile(firstOutputPath, 'external edit');
              }

              if (outputCopyCount === 2) {
                throw new Error('injected second output failure');
              }
            },
          },
        ),
        (error: unknown) => {
          assert.ok(error instanceof CommitRollbackError);
          assert.strictEqual(error.rollbackErrors.length, 1);
          assert.strictEqual(error.rollbackErrors[0]?.outputPath, firstOutputPath);
          return true;
        },
      );

      assert.strictEqual(await readFile(firstOutputPath, 'utf8'), 'external edit');
      await assert.rejects(readFile(secondOutputPath));
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });
});
