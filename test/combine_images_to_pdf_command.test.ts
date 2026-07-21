/* oxlint-disable vitest/expect-expect */

import assert from 'node:assert/strict';
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { createSandbox } from 'sinon';
import * as vscode from 'vscode';

import { COMBINE_IMAGES_TO_PDF_COMMAND } from '../src/commands/convert_images_to_single_pdf.js';

const VALID_PNG = path.resolve('test', 'fixtures', 'test.png');

suite('画像を1つのPDFへ結合するコマンド', () => {
  let sandbox: sinon.SinonSandbox;
  let showErrorMessage: sinon.SinonStub;

  setup(() => {
    sandbox = createSandbox();
    sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
    showErrorMessage = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);
  });

  teardown(() => {
    sandbox.restore();
  });

  test('コマンドが登録されている', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes(COMBINE_IMAGES_TO_PDF_COMMAND));
  });

  test('open workspace外の入力をworkspaceとして扱わない', async () => {
    const outsideDirectory = await mkdtemp(path.join(os.tmpdir(), 'lgh-combine-command-'));

    try {
      const sourcePath = path.join(outsideDirectory, 'outside.png');
      await copyFile(VALID_PNG, sourcePath);

      await vscode.commands.executeCommand(COMBINE_IMAGES_TO_PDF_COMMAND, vscode.Uri.file(sourcePath));

      assert.ok(showErrorMessage.calledOnce);
      assert.match(String(showErrorMessage.firstCall.args[0]), /inside an open workspace/);
    } finally {
      await rm(outsideDirectory, { recursive: true, force: true });
    }
  });
});
