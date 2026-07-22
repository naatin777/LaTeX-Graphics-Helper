// Test target:
// - 1件以上のPDFを1ページごとに分割し、全成功後に出力すること
// - 既存出力、出力重複、キャンセル時に出力を反映しないこと
// - 固定fixtureの各分割ページが元PDFの対応ページと同じ描画内容であること
//
// Mocked:
// - なし。pdf-libと実ファイルを使用する
//
// Not tested:
// - VS CodeのwithProgress UI
// - commandからのURI選択

import assert from 'node:assert/strict';
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PDFDocument } from 'pdf-lib';

import { splitPdfAllPages } from '../src/operations/split_pdf.js';

import { assertRenderedPdfPagesSimilar } from './helpers/pdf_visual_assertions.js';

const compiledTestDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixtureDirectory = path.resolve(
  compiledTestDirectory,
  '..',
  '..',
  'test',
  'fixtures',
  'pdf-operations',
  'user-files',
);

suite('PDF全ページ分割', () => {
  test('すべてのページを1始まりのページ番号で分割し、作業ファイルを残す', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-split-test-'));
    const sourcePath = path.join(workspacePath, 'q a.pdf');
    const outputDirectory = path.join(workspacePath, 'source');
    await copyFile(fixturePath('q a.pdf'), sourcePath);

    try {
      await splitPdfAllPages({
        jobs: [
          {
            sourcePath,
            workspacePath,
            outputPathForPage: (page: number) => path.join(outputDirectory, `${page}.pdf`),
          },
        ],
        runId: 'run',
      });

      const sourceDocument = await PDFDocument.load(await readFile(sourcePath));
      for (let page = 1; page <= sourceDocument.getPageCount(); page += 1) {
        const outputPath = path.join(outputDirectory, `${page}.pdf`);
        const output = await PDFDocument.load(await readFile(outputPath));
        assert.strictEqual(output.getPageCount(), 1);
        await assertRenderedPdfPagesSimilar({
          expectedPdfPath: sourcePath,
          expectedPageNumber: page,
          actualPdfPath: outputPath,
          actualPageNumber: 1,
          renderDirectory: path.join(workspacePath, 'rendered'),
          renderPrefix: `split-single-${page}`,
        });
      }

      const stagingDirectory = path.join(workspacePath, '.latex-graphics-helper', 'split-pdf', 'run', '1-q_a');
      await assert.doesNotReject(access(path.join(stagingDirectory, 'q a.pdf')));
      await assert.doesNotReject(access(path.join(stagingDirectory, 'pages', '1.pdf')));
      await assert.doesNotReject(access(path.join(stagingDirectory, 'pages', '2.pdf')));
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('複数PDFはすべての入力が成功してから出力する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-split-test-'));
    const sourcePaths = ['q a.pdf', ' 薔薇🌹.pdf'].map((fileName) => path.join(workspacePath, fileName));

    try {
      await Promise.all(sourcePaths.map((sourcePath) => copyFile(fixturePath(path.basename(sourcePath)), sourcePath)));

      await splitPdfAllPages({
        jobs: sourcePaths.map((sourcePath) => ({
          sourcePath,
          workspacePath,
          outputPathForPage: (page: number) =>
            path.join(workspacePath, path.basename(sourcePath, '.pdf'), `${page}.pdf`),
        })),
      });

      for (const [sourceIndex, sourcePath] of sourcePaths.entries()) {
        const sourceDocument = await PDFDocument.load(await readFile(sourcePath));
        for (let page = 1; page <= sourceDocument.getPageCount(); page += 1) {
          const outputPath = path.join(workspacePath, path.basename(sourcePath, '.pdf'), `${page}.pdf`);
          await assert.doesNotReject(access(outputPath));
          await assertRenderedPdfPagesSimilar({
            expectedPdfPath: sourcePath,
            expectedPageNumber: page,
            actualPdfPath: outputPath,
            actualPageNumber: 1,
            renderDirectory: path.join(workspacePath, 'rendered'),
            renderPrefix: `split-multiple-${sourceIndex + 1}-${page}`,
          });
        }
      }
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('出力先が既に存在する場合は何も作成しない', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-split-test-'));
    const sourcePath = path.join(workspacePath, 'source.pdf');
    const firstOutputPath = path.join(workspacePath, 'source', '1.pdf');
    const secondOutputPath = path.join(workspacePath, 'source', '2.pdf');
    await writePdf(sourcePath, 2);
    await mkdir(path.dirname(secondOutputPath), { recursive: true });
    await writeFile(secondOutputPath, 'existing');

    await assert.rejects(
      splitPdfAllPages({
        jobs: [
          {
            sourcePath,
            workspacePath,
            outputPathForPage: (page: number) => (page === 1 ? firstOutputPath : secondOutputPath),
          },
        ],
      }),
      /Output file already exists/,
    );

    await assert.rejects(access(firstOutputPath));
    assert.strictEqual(await readFile(secondOutputPath, 'utf8'), 'existing');
  });

  test('ページごとの出力パスが衝突する場合は出力しない', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-split-test-'));
    const sourcePath = path.join(workspacePath, 'source.pdf');
    const outputPath = path.join(workspacePath, 'same.pdf');
    await writePdf(sourcePath, 2);

    await assert.rejects(
      splitPdfAllPages({
        jobs: [
          {
            sourcePath,
            workspacePath,
            outputPathForPage: () => outputPath,
          },
        ],
      }),
      /same output/,
    );

    await assert.rejects(access(outputPath));
  });

  test('キャンセルされた場合は出力しない', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-split-test-'));
    const sourcePath = path.join(workspacePath, 'source.pdf');
    const outputPath = path.join(workspacePath, 'source', '1.pdf');
    const abortController = new AbortController();
    await writePdf(sourcePath, 1);
    abortController.abort();

    await assert.rejects(
      splitPdfAllPages({
        jobs: [
          {
            sourcePath,
            workspacePath,
            outputPathForPage: () => outputPath,
          },
        ],
        signal: abortController.signal,
      }),
      { name: 'AbortError' },
    );

    await assert.rejects(access(outputPath));
  });
});

async function writePdf(filePath: string, pageCount: number): Promise<void> {
  const document = await PDFDocument.create();

  for (let page = 1; page <= pageCount; page++) {
    document.addPage([100 + page, 200 + page]);
  }

  await writeFile(filePath, await document.save());
}

function fixturePath(fileName: string): string {
  return path.join(fixtureDirectory, fileName);
}
