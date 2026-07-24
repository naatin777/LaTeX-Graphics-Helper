// Test target:
// - 実Draw.io fixtureを複雑な入力pathへコピーしてPDF変換できること
// - Draw.io runnerへ入力pathと中間PDF出力pathをそのまま渡すこと
// - Draw.ioページ名、入力・出力のフォルダ名とファイル名に空白やUnicodeがあっても壊れないこと
// - 変換後PDFがfixtureと同じページ数・ページサイズで読み取れること
//
// Mocked:
// - Draw.io CLIの実行。CIにDraw.io Desktopを必須化せず、CLI境界へ渡すpathと出力の反映を検証する。

import assert from 'node:assert/strict';
import { copyFile, mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PDFDocument } from 'pdf-lib';

import { convertToPdfFiles } from '../../src/operations/conversion/convert_to_pdf.js';
import type { DrawioTools } from '../../src/operations/conversion/tools/drawio_tools.js';

const compiledTestDirectory = path.dirname(fileURLToPath(import.meta.url));
const drawioFixturePath = path.resolve(
  compiledTestDirectory,
  '..',
  '..',
  '..',
  'test',
  'fixtures',
  'pdf-operations',
  'user-files',
  ' 薔薇🌹.dio',
);
const pdfFixturePath = path.resolve(
  compiledTestDirectory,
  '..',
  '..',
  '..',
  'test',
  'fixtures',
  'pdf-operations',
  'user-files',
  ' 薔薇🌹.pdf',
);

suite('Draw.ioの複雑なpath変換', () => {
  test('ページ名・フォルダ名・ファイル名に空白とUnicodeがあっても3ページPDFへ変換する', async () => {
    const testRootPath = await mkdtemp(path.join(os.tmpdir(), 'lgh-drawio-complex-path-'));
    const workspacePath = path.join(
      testRootPath,
      'workspace 日本語 English 한국어 中文 العربية हिन्दी ไทย עברית Ελληνικά Русский 🌹　ＡＢＣ',
    );
    const inputDirectory = path.join(workspacePath, '入力 フォルダ　図面 العربية');
    const outputDirectory = path.join(workspacePath, '出力 フォルダ　結果 한국어');
    const sourcePath = path.join(inputDirectory, '　設計図 Drawio 日本語🌹　ＡＢＣ.dio.png');
    const outputPath = path.join(outputDirectory, '結果 ページ名　日本語🌹.pdf');

    try {
      await mkdir(inputDirectory, { recursive: true });
      await mkdir(outputDirectory, { recursive: true });
      await copyFile(drawioFixturePath, sourcePath);
      const originalSourceBytes = await readFile(sourcePath);
      const sourceText = originalSourceBytes.toString('utf8');
      assert.match(sourceText, /name="　ページ1 "/u);
      assert.match(sourceText, /name="ページ2🐶"/u);
      assert.match(sourceText, /name="ページ3"/u);

      const drawioCalls: { executable: string; args: string[] }[] = [];
      const drawio: DrawioTools = {
        drawioPath: 'drawio',
        runDrawio: async (executable, args) => {
          drawioCalls.push({ executable, args });
          const outputFlagIndex = args.indexOf('-o');
          assert.strictEqual(outputFlagIndex, 3);
          const toolOutputPath = args[outputFlagIndex + 1];
          assert.ok(toolOutputPath);
          assert.strictEqual(args[5], sourcePath);
          assert.ok(path.isAbsolute(toolOutputPath));
          assert.match(toolOutputPath, /workspace .*ＡＢＣ/u);
          await copyFile(pdfFixturePath, toolOutputPath);
        },
      };

      const outputs = await convertToPdfFiles({
        jobs: [
          {
            sourcePath,
            outputPath,
            workspacePath,
          },
        ],
        drawioTools: drawio,
        runtime: { resolveConflicts: async () => 'overwrite' },
        runId: 'drawio-complex-path',
      });

      assert.deepStrictEqual(outputs, [
        {
          outputPath,
          workspacePath,
          stagingRootPath: path.join(
            workspacePath,
            '.latex-graphics-helper',
            'convert-png-to-pdf',
            'drawio-complex-path',
          ),
        },
      ]);
      assert.strictEqual(drawioCalls.length, 1);
      assert.strictEqual(drawioCalls[0]?.executable, 'drawio');
      assert.deepStrictEqual(drawioCalls[0]?.args.slice(0, 4), ['-x', '-f', 'pdf', '-o']);
      assert.strictEqual(drawioCalls[0]?.args[5], sourcePath);
      assert.deepStrictEqual(await readFile(sourcePath), originalSourceBytes);

      const actualPdf = await PDFDocument.load(await readFile(outputPath));
      const expectedPdf = await PDFDocument.load(await readFile(pdfFixturePath));
      assert.strictEqual(actualPdf.getPageCount(), 3);
      assert.strictEqual(actualPdf.getPageCount(), expectedPdf.getPageCount());
      assert.deepStrictEqual(
        actualPdf.getPages().map((page) => page.getSize()),
        expectedPdf.getPages().map((page) => page.getSize()),
      );
    } finally {
      await rm(testRootPath, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });
});
