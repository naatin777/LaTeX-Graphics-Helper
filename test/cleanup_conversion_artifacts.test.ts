import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { cleanupConversionArtifacts } from '../src/operations/cleanup_conversion_artifacts.js';

suite('変換artifactのライフサイクル', () => {
  test('Undo用backupを残してstaging結果と入力コピーを削除する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-cleanup-workspace-'));
    const rootPath = path.join(workspacePath, '.latex-graphics-helper', 'run');
    const resultPath = path.join(rootPath, 'result.pdf');
    const sourcePath = path.join(rootPath, 'source.pdf');
    const backupPath = path.join(rootPath, 'result.pdf.previous');

    try {
      await writeFixture(resultPath);
      await writeFixture(sourcePath);
      await writeFixture(backupPath);

      await cleanupConversionArtifacts([{ rootPath, workspacePath, preservePaths: [backupPath] }]);

      await assert.rejects(access(resultPath));
      await assert.rejects(access(sourcePath));
      await assert.doesNotReject(access(backupPath));
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('workspace外へ解決するsymlinkをcleanupしない', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-cleanup-workspace-'));
    const outsidePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-cleanup-outside-'));
    const outsideFile = path.join(outsidePath, 'keep.txt');
    const symlinkPath = path.join(workspacePath, '.latex-graphics-helper', 'run');

    try {
      await writeFixture(outsideFile);
      await mkdir(path.dirname(symlinkPath), { recursive: true });
      await symlink(outsidePath, symlinkPath);

      await cleanupConversionArtifacts([{ rootPath: symlinkPath, workspacePath }]);

      await assert.doesNotReject(access(outsideFile));
      await assert.doesNotReject(access(symlinkPath));
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
      await rm(outsidePath, { recursive: true, force: true });
    }
  });

  test('cleanup失敗を成功結果へ伝播させずworkspace内の出力を維持する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-cleanup-workspace-'));
    const outsidePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-cleanup-outside-'));
    const outputPath = path.join(workspacePath, 'output.pdf');
    const symlinkPath = path.join(workspacePath, '.latex-graphics-helper', 'run');

    try {
      await writeFixture(outputPath);
      await mkdir(path.dirname(symlinkPath), { recursive: true });
      await symlink(outsidePath, symlinkPath);

      await cleanupConversionArtifacts([{ rootPath: symlinkPath, workspacePath }]);

      await assert.doesNotReject(access(outputPath));
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
      await rm(outsidePath, { recursive: true, force: true });
    }
  });

  test('operation cleanupは別session・未知directory・harness log・symlinkを削除しない', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-cleanup-workspace-'));
    const currentRoot = path.join(workspacePath, '.latex-graphics-helper', 'merge-pdf', 'current');
    const activePath = path.join(workspacePath, '.latex-graphics-helper', 'merge-pdf', 'other-active', 'result.pdf');
    const unknownPath = path.join(workspacePath, '.latex-graphics-helper', 'unknown', 'keep.txt');
    const harnessLogPath = path.join(workspacePath, '.latex-graphics-helper', 'harness', 'stop.log');
    const outsidePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-cleanup-outside-'));
    const outsideFile = path.join(outsidePath, 'keep.txt');
    const symlinkPath = path.join(workspacePath, '.latex-graphics-helper', 'link');

    try {
      await writeFixture(path.join(currentRoot, 'result.pdf'));
      await writeFixture(activePath);
      await writeFixture(unknownPath);
      await writeFixture(harnessLogPath);
      await writeFixture(outsideFile);
      await mkdir(path.dirname(symlinkPath), { recursive: true });
      await symlink(outsidePath, symlinkPath);

      await cleanupConversionArtifacts([{ rootPath: currentRoot, workspacePath }]);

      await assert.rejects(access(path.join(currentRoot, 'result.pdf')));
      await assert.doesNotReject(access(activePath));
      await assert.doesNotReject(access(unknownPath));
      await assert.doesNotReject(access(harnessLogPath));
      await assert.doesNotReject(access(symlinkPath));
      await assert.doesNotReject(access(outsideFile));
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
      await rm(outsidePath, { recursive: true, force: true });
    }
  });
});

async function writeFixture(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, 'fixture');
}
