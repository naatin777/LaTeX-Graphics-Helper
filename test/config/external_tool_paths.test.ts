import assert from 'node:assert/strict';

import {
  defaultDrawioPath,
  defaultGhostscriptPath,
  readDrawioExecutablePath,
  readGhostscriptExecutablePath,
  readPdftocairoExecutablePath,
  readRsvgConvertExecutablePath,
} from '../../src/config/external_tools/external_tool_paths.js';

suite('外部tool実行ファイルの既定値', () => {
  test('Draw.ioのOSごとの既定値を揃える', () => {
    assert.strictEqual(defaultDrawioPath('win32'), 'drawio.exe');
    assert.strictEqual(defaultDrawioPath('darwin'), 'drawio');
    assert.strictEqual(defaultDrawioPath('linux'), 'drawio');
  });

  test('GhostscriptのOSごとの既定値を揃える', () => {
    assert.strictEqual(defaultGhostscriptPath('win32'), 'gswin64c.exe');
    assert.strictEqual(defaultGhostscriptPath('darwin'), 'gs');
    assert.strictEqual(defaultGhostscriptPath('linux'), 'gs');
  });

  test('設定値を優先し、空白なら各toolの既定値へ戻す', () => {
    const configuration = {
      get<T>(key: string, defaultValue: T): T {
        return key === 'execPath.ghostscript' ? (' /custom/gs ' as T) : defaultValue;
      },
    };

    assert.strictEqual(readGhostscriptExecutablePath(configuration), '/custom/gs');
    assert.strictEqual(readDrawioExecutablePath(configuration), 'drawio');
    assert.strictEqual(readPdftocairoExecutablePath(configuration), 'pdftocairo');
    assert.strictEqual(readRsvgConvertExecutablePath(configuration), 'rsvg-convert');
  });

  test('Draw.ioの設定値をtrimして優先する', () => {
    assert.strictEqual(
      readDrawioExecutablePath({
        get<T>(_key: string, _defaultValue: T): T {
          return ' /custom/drawio ' as unknown as T;
        },
      }),
      '/custom/drawio',
    );
  });
});
