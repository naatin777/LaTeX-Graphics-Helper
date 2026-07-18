import assert from 'node:assert/strict';
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { CommitRollbackError } from '../src/operations/commit_conversion_outputs.js';
import { saveClipboardImage } from '../src/operations/save_clipboard_image.js';

suite('Clipboard画像保存のartifact ownership', () => {
  test('rollback失敗時は復旧backupを保持し、Clipboard外をcleanupしない', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-clipboard-save-'));
    const runId = 'rollback-failure';
    const outputPath = path.join(workspacePath, 'pasted.png');
    const clipboardRoot = path.join(workspacePath, '.latex-graphics-helper', 'clipboard-paste', runId);
    const unrelatedRoot = path.join(workspacePath, '.latex-graphics-helper', 'other', 'active');
    const lines: string[] = [];
    let copyCount = 0;

    try {
      await writeFile(outputPath, 'original image');
      await mkdir(unrelatedRoot, { recursive: true });
      await writeFile(path.join(unrelatedRoot, 'keep.txt'), 'keep');

      await assert.rejects(
        saveClipboardImage(
          {
            data: { type: { ext: 'png' }, buffer: Buffer.from('new image') },
            kind: 'image',
            outputBasePath: outputPath,
            workspacePath,
            runId,
          },
          {
            resolveConflicts: async () => 'overwrite',
            outputChannel: { appendLine: (line) => lines.push(line) },
          },
          {
            commit: {
              copyFile: async (source, destination, flags) => {
                copyCount += 1;

                if (destination === outputPath && copyCount === 2) {
                  throw new Error('injected commit copy failure');
                }

                if (destination === outputPath && copyCount === 3) {
                  throw new Error('injected rollback copy failure');
                }

                await copyFile(source, destination, flags);
              },
            },
          },
        ),
        (error: unknown) => {
          assert.ok(error instanceof CommitRollbackError);
          assert.match(error.originalError.message, /injected commit copy failure/);
          assert.strictEqual(error.rollbackErrors[0]?.outputPath, outputPath);
          assert.match(error.rollbackErrors[0]?.error.message ?? '', /injected rollback copy failure/);
          return true;
        },
      );

      const backupPath = path.join(clipboardRoot, 'source.png.previous');
      assert.strictEqual(await readFile(outputPath, 'utf8'), 'original image');
      assert.strictEqual(await readFile(backupPath, 'utf8'), 'original image');
      assert.strictEqual(await readFile(path.join(unrelatedRoot, 'keep.txt'), 'utf8'), 'keep');
      assert.ok(lines.some((line) => line.includes('rollback failed') && line.includes(outputPath)));
      assert.ok(lines.some((line) => line.includes('preserving recovery backup') && line.includes(backupPath)));
      await assert.doesNotReject(access(backupPath));
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });
});
