/* oxlint-disable vitest/expect-expect */

// Test target:
// - Safe Mode初期化時にstatus bar itemを作成すること
// - status bar itemのtext、command、tooltip、show()呼び出しが設定されること
// - toggle command実行時に状態とstatus bar textが更新されること
// - globalStateに保存済みの状態からstatus bar textを復元すること
// - ExtensionContext.subscriptionsへstatus bar itemとcommand disposableを登録すること
//
// Mocked:
// - vscode.window.createStatusBarItem
// - vscode.commands.registerCommand
// - ExtensionContext.globalState相当のkey-value storage
//
// Not tested:
// - 実際のVS Code画面上のstatus bar描画
// - status bar itemの表示位置
// - ダイアログの画面上の外観
// - VS Code再起動そのもの
// - crop、split、PNG変換の実ファイル処理

import assert from "node:assert/strict";

import sinon from "sinon";
import * as vscode from "vscode";

import { initializeSafeMode, TOGGLE_SAFE_MODE_COMMAND } from "../src/commands/safe_mode.js";

suite("Safe Modeステータスバー", () => {
  let sandbox: sinon.SinonSandbox;
  let storage: MemoryState;
  let statusBarItem: FakeStatusBarItem;
  let registeredCommand: (() => Promise<void>) | undefined;
  let subscriptions: vscode.Disposable[];

  setup(() => {
    sandbox = sinon.createSandbox();
    storage = new MemoryState();
    statusBarItem = new FakeStatusBarItem();
    subscriptions = [];
    registeredCommand = undefined;

    sandbox
      .stub(vscode.window, "createStatusBarItem")
      .returns(statusBarItem as unknown as vscode.StatusBarItem);
    sandbox
      .stub(vscode.commands, "registerCommand")
      .callsFake((command: string, callback: (...args: never[]) => unknown) => {
        assert.strictEqual(command, TOGGLE_SAFE_MODE_COMMAND);
        registeredCommand = callback as () => Promise<void>;
        return new FakeDisposable() as vscode.Disposable;
      });
  });

  teardown(() => {
    sandbox.restore();
  });

  test("初期状態ではSafe Mode ONのステータスバー項目を作成して表示する", () => {
    initializeSafeMode(createExtensionContext(storage, subscriptions));

    assert.strictEqual(statusBarItem.text, "$(shield) Safe Mode: ON");
    assert.strictEqual(statusBarItem.command, TOGGLE_SAFE_MODE_COMMAND);
    assert.strictEqual(statusBarItem.tooltip, "Toggle output overwrite confirmation");
    assert.strictEqual(statusBarItem.showCallCount, 1);
  });

  test("切り替えコマンド実行時に表示文言と永続化状態を更新する", async () => {
    initializeSafeMode(createExtensionContext(storage, subscriptions));

    await registeredCommand?.();

    assert.strictEqual(statusBarItem.text, "$(shield) Safe Mode: OFF");
    assert.strictEqual(storage.get("safeMode.enabled"), false);

    await registeredCommand?.();

    assert.strictEqual(statusBarItem.text, "$(shield) Safe Mode: ON");
    assert.strictEqual(storage.get("safeMode.enabled"), true);
  });

  test("初期化時にglobalStateからSafe Mode OFF状態を復元する", async () => {
    await storage.update("safeMode.enabled", false);

    initializeSafeMode(createExtensionContext(storage, subscriptions));

    assert.strictEqual(statusBarItem.text, "$(shield) Safe Mode: OFF");
  });

  test("ステータスバー項目とコマンドのdisposableをsubscriptionsに登録する", () => {
    initializeSafeMode(createExtensionContext(storage, subscriptions));

    assert.strictEqual(subscriptions.length, 2);
    assert.strictEqual(subscriptions[0], statusBarItem);
    assert.ok(subscriptions[1] instanceof FakeDisposable);
  });
});

function createExtensionContext(
  globalState: MemoryState,
  subscriptions: vscode.Disposable[],
): vscode.ExtensionContext {
  return {
    globalState,
    subscriptions,
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
  text = "";
  tooltip = "";
  showCallCount = 0;

  show(): void {
    this.showCallCount += 1;
  }

  dispose(): void {}
}

class FakeDisposable {
  dispose(): void {}
}
