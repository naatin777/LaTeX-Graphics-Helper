// Test target:
// - PNGをPDFに変換する機能
// - external toolが成功終了しても不正なPDFをcommitしないこと
//
// Mocked:
// - Draw.io CLIの不正出力caseのみrunnerを注入する
//
// Not tested:
// - VS Codeのcommand UI
// - 他の画像フォーマット（JPEG、WebP、Avif、SVG）の実変換

import assert from 'node:assert/strict';
import { access, copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

import {
  convertToPdfFiles,
  createSvgPuppeteerLaunchOptions,
  validateSvgToPdfOptions,
} from '../../src/operations/conversion/convert_to_pdf.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

suite('PDF変換operation（PNG入力）', () => {
  test('複数フレームのGIF jobは1フレーム1ページPDFとして変換する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-gif-to-pdf-'));

    try {
      const sourcePath = path.join(workspacePath, 'source.gif');
      const outputPaths = [1, 2].map((page) => path.join(workspacePath, `frame-${page}.pdf`));
      await writeAnimatedGif(sourcePath);

      await convertToPdfFiles({
        jobs: outputPaths.map((outputPath, index) => ({
          sourcePath,
          outputPath,
          workspacePath,
          page: index + 1,
        })),
        supportedExtensions: ['.gif'],
        operationName: 'convert-gif-to-pdf',
      });

      await Promise.all(
        outputPaths.map(async (outputPath) => {
          const document = await PDFDocument.load(await readFile(outputPath));
          assert.strictEqual(document.getPageCount(), 1);
        }),
      );
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('PNGをPDFへ変換する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-png-test-'));
    const sourcePath = path.join(workspacePath, 'source.png');
    const outputPath = path.join(workspacePath, 'output.pdf');

    try {
      await copyFile(path.join(dirname, '..', '..', '..', 'test', 'fixtures', 'test.png'), sourcePath);

      await convertToPdfFiles({
        jobs: [{ sourcePath, outputPath, workspacePath }],
        supportedExtensions: ['.png'],
        operationName: 'convert-png-to-pdf',
      });

      const { PDFDocument } = await import('pdf-lib');
      const pdf = await PDFDocument.load(await import('node:fs/promises').then((fs) => fs.readFile(outputPath)));
      assert.strictEqual(pdf.getPageCount(), 1);
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });
  test('preflightと実変換で設定pixel上限を共有する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-png-pixel-limit-'));
    const sourcePath = path.join(workspacePath, 'ten-by-ten.png');
    const limitedOutputPath = path.join(workspacePath, 'limited-output.pdf');
    const outputPath = path.join(workspacePath, 'output.pdf');

    try {
      await sharp({
        create: {
          width: 10,
          height: 10,
          channels: 4,
          background: { r: 32, g: 64, b: 96, alpha: 1 },
        },
      })
        .png()
        .toFile(sourcePath);

      await assert.rejects(
        convertToPdfFiles({
          jobs: [{ sourcePath, outputPath: limitedOutputPath, workspacePath }],
          maxInputPixels: 99,
          supportedExtensions: ['.png'],
          operationName: 'convert-png-to-pdf',
        }),
        /Configured limit: 99 pixels/,
      );

      await convertToPdfFiles({
        jobs: [{ sourcePath, outputPath, workspacePath }],
        maxInputPixels: 100,
        supportedExtensions: ['.png'],
        operationName: 'convert-png-to-pdf',
      });
      await access(outputPath);
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('Draw.io runnerが成功終了しても非PDF出力をcommitしない', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-pdf-invalid-output-'));
    const sourcePath = path.join(workspacePath, 'source.drawio.png');
    const outputPath = path.join(workspacePath, 'output.pdf');

    try {
      await writeFile(sourcePath, 'editable drawio image placeholder');

      await assert.rejects(
        convertToPdfFiles({
          jobs: [{ sourcePath, outputPath, workspacePath }],
          supportedExtensions: ['.drawio.png'],
          operationName: 'convert-to-pdf',
          drawioTools: {
            drawioPath: 'drawio',
            runDrawio: async (_executable, args) => {
              await writeFile(args[args.indexOf('-o') + 1]!, 'not a PDF');
            },
          },
        }),
        /unparsable PDF/,
      );
      await assert.rejects(access(outputPath));
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
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

async function writeAnimatedGif(filePath: string): Promise<void> {
  const red = await sharp({ create: { width: 4, height: 4, channels: 4, background: '#ff0000' } })
    .png()
    .toBuffer();
  const blue = await sharp({ create: { width: 4, height: 4, channels: 4, background: '#0000ff' } })
    .png()
    .toBuffer();
  await sharp([red, blue], { join: { animated: true } })
    .gif()
    .toFile(filePath);
}
