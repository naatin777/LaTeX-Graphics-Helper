// Test target:
// - 直前の変換出力が生成時から変更されていない場合だけ、全出力を削除すること
// - 変更、欠損、workspace外symlinkが1件でもあれば、削除を開始しないこと
//
// Mocked:
// - なし。実ファイルと実際のSHA-256計算を使用する
//
// Not tested:
// - VS Codeの通知UI
// - command登録
// - crop処理

import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { createSandbox, type SinonSandbox } from 'sinon';
import * as vscode from 'vscode';

import {
  rememberLastConversion,
  undoLastConversionCommand,
} from '../../src/commands/lifecycle/undo_last_conversion.js';
import {
  createConversionUndoRecord,
  undoConversionOutputs,
} from '../../src/operations/lifecycle/undo_last_conversion.js';

suite('直前変換の取り消し処理', () => {
  let sandbox: SinonSandbox;

  setup(() => {
    sandbox = createSandbox();
    sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
    sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);
    sandbox.stub(vscode.window, 'showWarningMessage').resolves(undefined);
  });

  teardown(() => {
    sandbox.restore();
  });

  test('複数のUndo recordを保持し、直近recordのbackupを保持する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-undo-workspace-'));
    const firstOutputPath = path.join(workspacePath, 'first.pdf');
    const secondOutputPath = path.join(workspacePath, 'second.pdf');
    const firstRoot = path.join(workspacePath, '.latex-graphics-helper', 'first');
    const secondRoot = path.join(workspacePath, '.latex-graphics-helper', 'second');
    const firstBackupPath = path.join(firstRoot, 'first.previous');
    const secondBackupPath = path.join(secondRoot, 'second.previous');

    try {
      await writeFixture(firstOutputPath, 'generated-first');
      await writeFixture(firstBackupPath, 'original-first');
      await rememberLastConversion([
        {
          outputPath: firstOutputPath,
          workspacePath,
          previousFilePath: firstBackupPath,
          stagingRootPath: firstRoot,
        },
      ]);
      await assert.doesNotReject(access(firstBackupPath));

      await writeFixture(secondOutputPath, 'generated-second');
      await writeFixture(secondBackupPath, 'original-second');
      await rememberLastConversion([
        {
          outputPath: secondOutputPath,
          workspacePath,
          previousFilePath: secondBackupPath,
          stagingRootPath: secondRoot,
        },
      ]);

      await assert.doesNotReject(access(firstBackupPath));
      await assert.doesNotReject(access(secondBackupPath));
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('複数回のUndoを新しい変換から順に適用できる', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-undo-workspace-'));
    const outputPath = path.join(workspacePath, 'output.pdf');
    const firstRoot = path.join(workspacePath, '.latex-graphics-helper', 'first');
    const secondRoot = path.join(workspacePath, '.latex-graphics-helper', 'second');

    try {
      await writeFixture(outputPath, 'first');
      const firstRecordId = await rememberLastConversion([{ outputPath, workspacePath, stagingRootPath: firstRoot }]);

      const secondBackupPath = path.join(secondRoot, 'output.previous');
      await writeFixture(secondBackupPath, 'first');
      await writeFixture(outputPath, 'second');
      const secondRecordId = await rememberLastConversion([
        { outputPath, workspacePath, previousFilePath: secondBackupPath, stagingRootPath: secondRoot },
      ]);

      await undoLastConversionCommand(secondRecordId);
      assert.strictEqual(await readFile(outputPath, 'utf8'), 'first');
      await undoLastConversionCommand(firstRecordId);
      await assert.rejects(access(outputPath));
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('Undo成功後に対象recordのbackupとstagingを削除する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-undo-workspace-'));
    const outputPath = path.join(workspacePath, 'output.pdf');
    const rootPath = path.join(workspacePath, '.latex-graphics-helper', 'run');
    const previousFilePath = path.join(rootPath, 'output.previous');

    try {
      await writeFixture(outputPath, 'generated');
      await writeFixture(previousFilePath, 'original');
      const record = await createConversionUndoRecord([
        { outputPath, workspacePath, previousFilePath, stagingRootPath: rootPath },
      ]);

      await undoConversionOutputs(record);

      assert.strictEqual(await readFile(outputPath, 'utf8'), 'original');
      await assert.rejects(access(previousFilePath));
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('変更されていない出力を削除し、workspace内の作業ファイルは残す', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-undo-workspace-'));
    const firstOutputPath = path.join(workspacePath, 'output', 'first.pdf');
    const secondOutputPath = path.join(workspacePath, 'output', 'second.pdf');
    const stagedOutputPath = path.join(workspacePath, '.latex-graphics-helper', 'crop-pdf', 'run', 'result.pdf');
    await writeFixture(firstOutputPath, 'first');
    await writeFixture(secondOutputPath, 'second');
    await writeFixture(stagedOutputPath, 'staged');

    const record = await createConversionUndoRecord([
      { outputPath: firstOutputPath, workspacePath },
      { outputPath: secondOutputPath, workspacePath },
    ]);

    await undoConversionOutputs(record);

    await assert.rejects(access(firstOutputPath));
    await assert.rejects(access(secondOutputPath));
    await assert.doesNotReject(access(stagedOutputPath));
  });

  test('出力の1つが変更されている場合はどの出力も削除しない', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-undo-workspace-'));
    const firstOutputPath = path.join(workspacePath, 'first.pdf');
    const secondOutputPath = path.join(workspacePath, 'second.pdf');
    await writeFixture(firstOutputPath, 'first');
    await writeFixture(secondOutputPath, 'second');

    const record = await createConversionUndoRecord([
      { outputPath: firstOutputPath, workspacePath },
      { outputPath: secondOutputPath, workspacePath },
    ]);
    await writeFile(secondOutputPath, 'edited');

    await assert.rejects(undoConversionOutputs(record), /changed after conversion/);
    await assert.doesNotReject(access(firstOutputPath));
    await assert.doesNotReject(access(secondOutputPath));
  });

  test('出力の1つが存在しない場合はどの出力も削除しない', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-undo-workspace-'));
    const firstOutputPath = path.join(workspacePath, 'first.pdf');
    const secondOutputPath = path.join(workspacePath, 'second.pdf');
    await writeFixture(firstOutputPath, 'first');
    await writeFixture(secondOutputPath, 'second');

    const record = await createConversionUndoRecord([
      { outputPath: firstOutputPath, workspacePath },
      { outputPath: secondOutputPath, workspacePath },
    ]);
    await rm(secondOutputPath);

    await assert.rejects(undoConversionOutputs(record));
    await assert.doesNotReject(access(firstOutputPath));
  });

  test('出力の1つがworkspace外へのsymlinkになった場合はどの出力も削除しない', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-undo-workspace-'));
    const outsidePath = path.join(await mkdtemp(path.join(os.tmpdir(), 'lgh-undo-outside-')), 'outside.pdf');
    const firstOutputPath = path.join(workspacePath, 'first.pdf');
    const secondOutputPath = path.join(workspacePath, 'second.pdf');
    await writeFixture(outsidePath, 'outside');
    await writeFixture(firstOutputPath, 'first');
    await writeFixture(secondOutputPath, 'second');

    const record = await createConversionUndoRecord([
      { outputPath: firstOutputPath, workspacePath },
      { outputPath: secondOutputPath, workspacePath },
    ]);
    await rm(secondOutputPath);
    await symlink(outsidePath, secondOutputPath);

    await assert.rejects(undoConversionOutputs(record), /outside the workspace/);
    await assert.doesNotReject(access(firstOutputPath));
    await assert.doesNotReject(access(outsidePath));
  });

  test('上書きされた出力を取り消すと以前のファイルを復元する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-undo-workspace-'));
    const outputPath = path.join(workspacePath, 'output.pdf');
    const previousFilePath = path.join(workspacePath, '.latex-graphics-helper', 'output.previous');
    await writeFixture(outputPath, 'generated');
    await writeFixture(previousFilePath, 'original');

    const record = await createConversionUndoRecord([{ outputPath, workspacePath, previousFilePath }]);

    await undoConversionOutputs(record);

    assert.strictEqual(await readFile(outputPath, 'utf8'), 'original');
    await assert.doesNotReject(access(previousFilePath));
  });

  test('変換後に出力が変更されている場合は上書き前のファイルを復元しない', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-undo-workspace-'));
    const outputPath = path.join(workspacePath, 'output.pdf');
    const previousFilePath = path.join(workspacePath, '.latex-graphics-helper', 'output.previous');
    await writeFixture(outputPath, 'generated');
    await writeFixture(previousFilePath, 'original');

    const record = await createConversionUndoRecord([{ outputPath, workspacePath, previousFilePath }]);
    await writeFile(outputPath, 'edited');

    await assert.rejects(undoConversionOutputs(record), /changed after conversion/);
    assert.strictEqual(await readFile(outputPath, 'utf8'), 'edited');
  });
});

async function writeFixture(filePath: string, contents: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents);
}
