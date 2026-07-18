import assert from 'node:assert/strict';
import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createSandbox } from 'sinon';
import * as vscode from 'vscode';

import { INTERNAL_COMMAND_IDS, PUBLIC_COMMAND_IDS } from '../src/extension.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));

suite('拡張機能の基本動作', () => {
  test('拡張機能が登録されている', () => {
    const extension = vscode.extensions.getExtension('naatin777.latex-graphics-helper');

    assert.ok(extension);
  });

  test('拡張機能をactivateできる', async () => {
    const extension = vscode.extensions.getExtension('naatin777.latex-graphics-helper');

    assert.ok(extension);

    await extension.activate();

    assert.strictEqual(extension.isActive, true);
  });

  test('自動cropコマンドが登録されている', async () => {
    const commands = await vscode.commands.getCommands(true);

    assert.ok(commands.includes('latex-graphics-helper.cropPdf.auto'));
  });

  test('configure cropコマンドが登録されている', async () => {
    const commands = await vscode.commands.getCommands(true);

    assert.ok(commands.includes('latex-graphics-helper.cropPdf.configure'));
    assert.ok(!commands.includes('latex-graphics-helper.cropPdf.manual'));
  });

  test('全ページ分割コマンドが登録されている', async () => {
    const commands = await vscode.commands.getCommands(true);

    assert.ok(commands.includes('latex-graphics-helper.splitPdf.allPages'));
  });

  test('PNGからPDFへの変換コマンドが登録されている', async () => {
    const commands = await vscode.commands.getCommands(true);

    assert.ok(commands.includes('latex-graphics-helper.convertPngToPdf'));
  });

  test('manifestの公開commandと実際の登録commandが一致する', async () => {
    const extension = vscode.extensions.getExtension('naatin777.latex-graphics-helper');
    assert.ok(extension);
    await extension.activate();

    const registeredCommands = new Set(await vscode.commands.getCommands(true));

    for (const commandId of [...PUBLIC_COMMAND_IDS, ...INTERNAL_COMMAND_IDS]) {
      assert.ok(registeredCommands.has(commandId), `${commandId} is not registered`);
    }
  });

  test('PNGからPDFへの変換コマンドを実行してファイル変換できる', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder);

    const sandbox = createSandbox();
    const temporaryDirectory = await mkdtemp(path.join(workspaceFolder.uri.fsPath, 'lgh-extension-test-'));

    try {
      sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

      const sourcePath = path.join(temporaryDirectory, 'source.png');
      const outputPath = path.join(temporaryDirectory, 'source.pdf');
      await copyFile(path.join(testDirectory, '..', '..', 'test', 'fixtures', 'test.png'), sourcePath);

      await vscode.commands.executeCommand('latex-graphics-helper.convertPngToPdf', vscode.Uri.file(sourcePath));

      const { PDFDocument } = await import('pdf-lib');
      const pdf = await PDFDocument.load(await readFile(outputPath));
      assert.strictEqual(pdf.getPageCount(), 1);
    } finally {
      sandbox.restore();
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
