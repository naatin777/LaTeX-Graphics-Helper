// Test target:
// - settings.jsonの無効なoutputPathを変換開始前に拒否すること
//
// Mocked:
// - margin picker
// - error notification
// - progress UI
// - output channel
//
// Not tested:
// - crop処理本体
// - OSが返すfilesystem error文言

import assert from 'node:assert/strict';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument } from 'pdf-lib';
import { createSandbox } from 'sinon';
import * as vscode from 'vscode';

import { cropPdfAutoCommand } from '../../src/commands/pdf/crop_pdf_auto.js';

suite('PDF crop outputPath検証', () => {
  test('NULを含む設定では進捗表示と作業ファイル作成を開始しない', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder);

    const sandbox = createSandbox();
    const temporaryDirectory = await mkdtemp(path.join(workspaceFolder.uri.fsPath, 'lgh-output-path-validation-'));
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');

    try {
      const sourcePath = path.join(temporaryDirectory, 'source.pdf');
      const document = await PDFDocument.create();
      document.addPage([100, 100]);
      await writeFile(sourcePath, await document.save());
      await configuration.update(
        'outputPath.cropPdf',
        '${fileDirname}/invalid\u0000.pdf',
        vscode.ConfigurationTarget.Workspace,
      );

      sandbox.stub(vscode.window, 'showQuickPick').resolves({
        label: '0 pt',
        description: 'Crop to the detected content bounds',
        margin: 0,
      } as vscode.QuickPickItem & { margin: number });
      const showErrorMessage = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);
      const withProgress = sandbox
        .stub(vscode.window, 'withProgress')
        .rejects(new Error('withProgress must not be called for an invalid output path.'));
      const createOutputChannel = sandbox
        .stub(vscode.window, 'createOutputChannel')
        .returns({ dispose() {} } as unknown as vscode.LogOutputChannel);

      await cropPdfAutoCommand(vscode.Uri.file(sourcePath));

      assert.ok(withProgress.notCalled);
      assert.ok(createOutputChannel.notCalled);
      assert.ok(showErrorMessage.calledOnce);
      assert.match(showErrorMessage.firstCall.args[0], /invalid output path.*NUL/i);
      await assert.rejects(access(path.join(temporaryDirectory, '.latex-graphics-helper')));
    } finally {
      sandbox.restore();
      await configuration.update('outputPath.cropPdf', undefined, vscode.ConfigurationTarget.Workspace);
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
