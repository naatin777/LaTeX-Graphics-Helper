/* oxlint-disable vitest/expect-expect */

// Test target:
// - Safe Mode ON時のダイアログ選択結果を競合判断へ変換すること
// - Safe Mode OFF時はダイアログを表示せずoverwriteを返すこと
// - 複数競合時もダイアログを1回だけ表示し、競合件数を文言へ渡すこと
//
// Mocked:
// - vscode.window.showWarningMessageの戻り値
// - vscode.window.createStatusBarItem
// - vscode.commands.registerCommand
// - ExtensionContext.globalState相当のkey-value storage
//
// Not tested:
// - ダイアログが画面上で正しく描画されること
// - ボタンの配置や外観
// - status barの描画
// - ファイルの実際の反映処理

import assert from 'node:assert/strict';

import sinon from 'sinon';
import * as vscode from 'vscode';

import { initializeSafeMode, resolveOutputConflicts } from '../src/commands/safe_mode.js';

suite('Safe Modeダイアログの判断', () => {
  let sandbox: sinon.SinonSandbox;
  let storage: MemoryState;
  let showWarningMessageStub: sinon.SinonStub;

  setup(() => {
    sandbox = sinon.createSandbox();
    storage = new MemoryState();
    showWarningMessageStub = sandbox.stub(vscode.window, 'showWarningMessage') as sinon.SinonStub;
    sandbox.stub(vscode.window, 'createStatusBarItem').returns(new FakeStatusBarItem() as vscode.StatusBarItem);
    sandbox.stub(vscode.commands, 'registerCommand').returns(new FakeDisposable() as vscode.Disposable);
    initializeSafeMode(createExtensionContext(storage));
  });

  teardown(() => {
    sandbox.restore();
  });

  test('Keep Bothを選択した場合はkeep-bothを返す', async () => {
    showWarningMessageStub.resolves({ title: 'Keep Both' });

    assert.strictEqual(await resolveOutputConflicts(['/workspace/sample.pdf']), 'keep-both');
  });

  test('Do Not Overwriteを選択した場合はcancelを返す', async () => {
    showWarningMessageStub.resolves({ title: 'Do Not Overwrite' });

    assert.strictEqual(await resolveOutputConflicts(['/workspace/sample.pdf']), 'cancel');
  });

  test('Overwriteを選択した場合はoverwriteを返す', async () => {
    showWarningMessageStub.resolves({ title: 'Overwrite' });

    assert.strictEqual(await resolveOutputConflicts(['/workspace/sample.pdf']), 'overwrite');
  });

  test('ダイアログを閉じた場合はcancelを返す', async () => {
    showWarningMessageStub.resolves(undefined);

    assert.strictEqual(await resolveOutputConflicts(['/workspace/sample.pdf']), 'cancel');
  });

  test('Do Not Overwriteを閉じる操作として扱い、単独のCancel項目は渡さない', async () => {
    showWarningMessageStub.resolves({ title: 'Do Not Overwrite' });

    await resolveOutputConflicts(['/workspace/sample.pdf']);

    const items = showWarningMessageStub.firstCall.args.slice(2) as vscode.MessageItem[];
    assert.deepStrictEqual(
      items.map((item) => item.title),
      ['Keep Both', 'Do Not Overwrite', 'Overwrite'],
    );
    assert.strictEqual(items.find((item) => item.title === 'Do Not Overwrite')?.isCloseAffordance, true);
    assert.strictEqual(
      items.some((item) => item.title === 'Cancel'),
      false,
    );
  });

  test('Safe Modeが無効な場合はダイアログを出さずoverwriteを返す', async () => {
    await storage.update('safeMode.enabled', false);
    initializeSafeMode(createExtensionContext(storage));

    assert.strictEqual(await resolveOutputConflicts(['/workspace/sample.pdf']), 'overwrite');
    assert.strictEqual(showWarningMessageStub.callCount, 0);
  });

  test('複数競合でもダイアログは1回だけ表示し、競合数を含める', async () => {
    showWarningMessageStub.resolves({ title: 'Overwrite' });

    assert.strictEqual(
      await resolveOutputConflicts(['/workspace/one.pdf', '/workspace/two.pdf', '/workspace/three.pdf']),
      'overwrite',
    );

    assert.strictEqual(showWarningMessageStub.callCount, 1);
    assert.strictEqual(showWarningMessageStub.firstCall.args[0], '3 output file(s) already exist.');
  });
});

function createExtensionContext(globalState: MemoryState): vscode.ExtensionContext {
  return {
    globalState,
    subscriptions: [],
  } as unknown as vscode.ExtensionContext;
}

class MemoryState {
  readonly #values = new Map<string, unknown>();

  get<T>(key: string, defaultValue?: T): T | undefined {
    return (this.#values.has(key) ? this.#values.get(key) : defaultValue) as T | undefined;
  }

  async update(key: string, value: unknown): Promise<void> {
    this.#values.set(key, value);
  }
}

class FakeStatusBarItem {
  command: string | undefined;
  text = '';
  tooltip = '';

  show(): void {}

  dispose(): void {}
}

class FakeDisposable {
  dispose(): void {}
}
