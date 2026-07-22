// Test target:
// - PNGをPDFに変換する機能
//
// Mocked:
// - なし。実PNGファイルと実ファイル出力を使用する
//
// Not tested:
// - VS Codeのcommand UI
// - 他の画像フォーマット（JPEG、WebP、Avif、SVG）の変換

import assert from 'node:assert/strict';
import { copyFile, mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  convertToPdfFiles,
  createSvgPuppeteerLaunchOptions,
  validateSvgToPdfOptions,
} from '../src/operations/convert_to_pdf.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

suite('PDF変換operation（PNG入力）', () => {
  test('PNGをPDFへ変換する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-png-test-'));
    const sourcePath = path.join(workspacePath, 'source.png');
    const outputPath = path.join(workspacePath, 'output.pdf');

    // Copy fixture PNG file
    await copyFile(path.join(dirname, '..', '..', 'test', 'fixtures', 'test.png'), sourcePath);

    await convertToPdfFiles({
      jobs: [{ sourcePath, outputPath, workspacePath }],
      supportedExtensions: ['.png'],
      operationName: 'convert-png-to-pdf',
    });

    // Verify output PDF exists
    const { PDFDocument } = await import('pdf-lib');
    const pdf = await PDFDocument.load(await import('node:fs/promises').then((fs) => fs.readFile(outputPath)));
    assert.strictEqual(pdf.getPageCount(), 1);
  });

  test('Firefox選択時は実行ファイルの指定を必須にする', () => {
    assert.throws(
      () =>
        validateSvgToPdfOptions({
          engine: 'puppeteer',
          rsvgConvertPath: 'rsvg-convert',
          puppeteerBrowser: 'firefox',
          puppeteerBrowserChannel: 'chrome',
        }),
      /puppeteer\.executablePath must be set/,
    );
  });

  test('FirefoxのPuppeteer起動には指定された実行ファイルを使う', () => {
    const options = createSvgPuppeteerLaunchOptions({
      engine: 'puppeteer',
      rsvgConvertPath: 'rsvg-convert',
      puppeteerBrowser: 'firefox',
      puppeteerBrowserChannel: 'chrome',
      puppeteerExecutablePath: '/opt/firefox/firefox',
    });

    assert.strictEqual(options.executablePath, '/opt/firefox/firefox');
    assert.strictEqual('channel' in options, false);
  });
});
