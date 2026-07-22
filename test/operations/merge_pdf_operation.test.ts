import assert from 'node:assert/strict';
import { access, copyFile, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { rememberLastConversion } from '../../src/commands/lifecycle/undo_last_conversion.js';
import { mergePdf } from '../../src/operations/pdf/merge_pdf.js';
import {
  createConversionUndoRecord,
  undoConversionOutputs,
} from '../../src/operations/lifecycle/undo_last_conversion.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixtureDirectory = path.join(testDirectory, '..', '..', '..', 'test', 'fixtures', 'pdf-operations', 'user-files');
const firstFixturePath = path.join(fixtureDirectory, 'q a.pdf');
const secondFixturePath = path.join(fixtureDirectory, ' 薔薇🌹.pdf');

suite('PDF結合operation', () => {
  test('結合結果をstagingへ作成してSafe Modeの両方残すを適用する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-merge-operation-'));

    try {
      const firstPath = path.join(workspacePath, 'first.pdf');
      const secondPath = path.join(workspacePath, 'second.pdf');
      const outputPath = path.join(workspacePath, 'merged.pdf');
      await copyFile(firstFixturePath, firstPath);
      await copyFile(secondFixturePath, secondPath);
      await writeFile(outputPath, 'existing output');

      const outputs = await mergePdf({
        sourcePaths: [firstPath, secondPath],
        outputPath,
        workspacePath,
        runId: 'safe-mode',
        runtime: { resolveConflicts: async () => 'keep-both' },
      });
      await rememberLastConversion(outputs);

      assert.strictEqual(outputs[0]?.outputPath, path.join(workspacePath, 'merged-1.pdf'));
      assert.strictEqual(await readFile(outputPath, 'utf8'), 'existing output');
      await assert.rejects(access(path.join(workspacePath, '.latex-graphics-helper', 'merge-pdf', 'safe-mode')));
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('上書き後のUndoで既存PDFを復元する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-merge-operation-'));

    try {
      const firstPath = path.join(workspacePath, 'first.pdf');
      const secondPath = path.join(workspacePath, 'second.pdf');
      const outputPath = path.join(workspacePath, 'merged.pdf');
      await copyFile(firstFixturePath, firstPath);
      await copyFile(secondFixturePath, secondPath);
      await copyFile(firstFixturePath, outputPath);
      const originalOutput = await readFile(outputPath);

      const outputs = await mergePdf({
        sourcePaths: [firstPath, secondPath],
        outputPath,
        workspacePath,
        runId: 'undo',
        runtime: { resolveConflicts: async () => 'overwrite' },
      });
      const undoRecord = await createConversionUndoRecord(outputs);

      await undoConversionOutputs(undoRecord);

      assert.deepStrictEqual(await readFile(outputPath), originalOutput);
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('変換開始前にキャンセルされた場合は出力を作成しない', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-merge-operation-'));

    try {
      const firstPath = path.join(workspacePath, 'first.pdf');
      const secondPath = path.join(workspacePath, 'second.pdf');
      const outputPath = path.join(workspacePath, 'merged.pdf');
      await copyFile(firstFixturePath, firstPath);
      await copyFile(secondFixturePath, secondPath);
      const abortController = new AbortController();
      abortController.abort();

      await assert.rejects(
        mergePdf({
          sourcePaths: [firstPath, secondPath],
          outputPath,
          workspacePath,
          runtime: {
            signal: abortController.signal,
            resolveConflicts: async () => 'overwrite',
          },
        }),
        { name: 'AbortError' },
      );
      await assert.rejects(access(outputPath));
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('preflightより先にworkspace境界を検証し、外部symlink入力を読み込まない', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-merge-operation-'));
    const outsidePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-merge-outside-'));

    try {
      const linkedSourcePath = path.join(workspacePath, 'linked.pdf');
      const secondPath = path.join(workspacePath, 'second.pdf');
      const outputPath = path.join(workspacePath, 'merged.pdf');
      const stagingRootPath = path.join(workspacePath, '.latex-graphics-helper', 'merge-pdf', 'boundary');
      const outsideSourcePath = path.join(outsidePath, 'malformed.pdf');

      await writeFile(outsideSourcePath, 'not a PDF');
      await symlink(outsideSourcePath, linkedSourcePath);
      await copyFile(secondFixturePath, secondPath);

      await assert.rejects(
        mergePdf({
          sourcePaths: [linkedSourcePath, secondPath],
          outputPath,
          workspacePath,
          runId: 'boundary',
        }),
        /outside the workspace/,
      );

      await assert.rejects(access(outputPath));
      await assert.rejects(access(stagingRootPath));
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
      await rm(outsidePath, { recursive: true, force: true });
    }
  });

  test('競合解決でキャンセルされた場合はstagingを削除し既存出力を維持する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-merge-operation-'));

    try {
      const firstPath = path.join(workspacePath, 'first.pdf');
      const secondPath = path.join(workspacePath, 'second.pdf');
      const outputPath = path.join(workspacePath, 'merged.pdf');
      const stagingRootPath = path.join(workspacePath, '.latex-graphics-helper', 'merge-pdf', 'cancelled');
      await copyFile(firstFixturePath, firstPath);
      await copyFile(secondFixturePath, secondPath);
      await writeFile(outputPath, 'existing output');

      await assert.rejects(
        mergePdf({
          sourcePaths: [firstPath, secondPath],
          outputPath,
          workspacePath,
          runId: 'cancelled',
          runtime: { resolveConflicts: async () => 'cancel' },
        }),
        /cancelled/,
      );

      assert.strictEqual(await readFile(outputPath, 'utf8'), 'existing output');
      await assert.rejects(access(stagingRootPath));
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });
});
