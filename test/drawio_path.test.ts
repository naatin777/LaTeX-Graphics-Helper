import assert from 'node:assert/strict';

import { defaultDrawioPath, readDrawioExecutablePath } from '../src/config/drawio_path.js';

suite('Draw.io実行ファイルの既定値', () => {
  test('OSごとの既定値を揃える', () => {
    assert.strictEqual(defaultDrawioPath('win32'), 'drawio.exe');
    assert.strictEqual(defaultDrawioPath('darwin'), 'drawio');
    assert.strictEqual(defaultDrawioPath('linux'), 'drawio');
  });

  test('設定値を優先し、空白なら既定値へ戻す', () => {
    const configuration = {
      get<T>(_key: string, defaultValue: T): T {
        return defaultValue;
      },
    };
    assert.strictEqual(readDrawioExecutablePath(configuration), defaultDrawioPath());

    assert.strictEqual(
      readDrawioExecutablePath({
        get<T>(_key: string, _defaultValue: T): T {
          return ' /custom/drawio ' as T;
        },
      }),
      '/custom/drawio',
    );
  });
});
