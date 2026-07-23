import assert from 'node:assert/strict';

import * as vscode from 'vscode';
import { DEFAULT_MAX_INPUT_PIXELS, getMaxInputPixels } from '../../src/config/raster_input.js';
import { withWorkspaceSettings } from '../helpers/workspace_settings.js';

suite('Raster入力pixel上限設定', () => {
  test('未設定時はSharp既定値を返す', async () => {
    await withWorkspaceSettings({ 'latex-graphics-helper.raster.maxInputPixels': undefined }, async () => {
      assert.strictEqual(
        getMaxInputPixels(vscode.workspace.getConfiguration('latex-graphics-helper')),
        DEFAULT_MAX_INPUT_PIXELS,
      );
    });
  });

  test('正の整数のカスタム値を返す', async () => {
    await withWorkspaceSettings({ 'latex-graphics-helper.raster.maxInputPixels': 100 }, async () => {
      assert.strictEqual(getMaxInputPixels(vscode.workspace.getConfiguration('latex-graphics-helper')), 100);
    });
  });

  test('不正な値は既定値へ戻す', () => {
    for (const value of [
      0,
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      '100',
      Number.MAX_SAFE_INTEGER + 1,
      undefined,
    ]) {
      assert.strictEqual(
        getMaxInputPixels({
          get<T>(_key: string, defaultValue: T): T {
            return (value === undefined ? defaultValue : value) as T;
          },
        }),
        DEFAULT_MAX_INPUT_PIXELS,
        `unexpected value: ${String(value)}`,
      );
    }
  });
  test('設定項目がworkspace設定として公開される', () => {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    assert.strictEqual(configuration.get<number>('raster.maxInputPixels'), DEFAULT_MAX_INPUT_PIXELS);
  });
});
