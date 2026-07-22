// Test target:
// - Safe Modeが初期値ONで、切替状態をglobal storageへ保存すること
//
// Mocked:
// - ExtensionContext.globalState相当のkey-value storage
//
// Not tested:
// - VS Codeのstatus bar描画
// - command登録

import assert from 'node:assert/strict';

import { SafeModeState } from '../../src/application/policy/safe_mode.js';

suite('Safe Mode状態', () => {
  test('初期状態では有効である', () => {
    const state = new SafeModeState(new MemoryState());

    assert.strictEqual(state.isEnabled(), true);
  });

  test('切り替えた値をglobalStateに保存する', async () => {
    const storage = new MemoryState();
    const state = new SafeModeState(storage);

    assert.strictEqual(await state.toggle(), false);
    assert.strictEqual(storage.get('safeMode.enabled'), false);
    assert.strictEqual(new SafeModeState(storage).isEnabled(), false);
    assert.strictEqual(await state.toggle(), true);
    assert.strictEqual(storage.get('safeMode.enabled'), true);
  });
});

class MemoryState {
  readonly #values = new Map<string, unknown>();

  get<T>(key: string, defaultValue?: T): T | undefined {
    return (this.#values.has(key) ? this.#values.get(key) : defaultValue) as T | undefined;
  }

  async update(key: string, value: unknown): Promise<void> {
    this.#values.set(key, value);
  }
}
