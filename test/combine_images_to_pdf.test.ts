/* oxlint-disable vitest/expect-expect */

import assert from 'node:assert/strict';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PDFDocument } from 'pdf-lib';

import { combineImagesToPdf } from '../src/operations/combine_images_to_pdf.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const VALID_PNG = path.join(testDirectory, '..', '..', 'test', 'fixtures', 'test.png');

async function setupWorkspace(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'lgh-combine-'));
}

async function copyFixtureTo(workspacePath: string, name: string): Promise<string> {
  const destination = path.join(workspacePath, name);
  await copyFile(VALID_PNG, destination);
  return destination;
}

suite('画像→1PDF結合', () => {
  test('単一のPNG画像を1ページPDFに変換する', async () => {
    const workspacePath = await setupWorkspace();

    try {
      const sourcePath = await copyFixtureTo(workspacePath, 'input.png');
      const outputPath = path.join(workspacePath, 'result.pdf');

      await combineImagesToPdf({
        jobs: [{ sourcePath }],
        outputPath,
        workspacePath,
      });

      const pdfBytes = await readFile(outputPath);
      const document = await PDFDocument.load(pdfBytes);
      assert.strictEqual(document.getPageCount(), 1);
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('複数のPNG画像を選択順で複数ページPDFに結合する', async () => {
    const workspacePath = await setupWorkspace();

    try {
      const sourcePaths = await Promise.all([
        copyFixtureTo(workspacePath, 'a.png'),
        copyFixtureTo(workspacePath, 'b.png'),
        copyFixtureTo(workspacePath, 'c.png'),
      ]);
      const outputPath = path.join(workspacePath, 'result.pdf');

      await combineImagesToPdf({
        jobs: sourcePaths.map((sourcePath) => ({ sourcePath })),
        outputPath,
        workspacePath,
      });

      const pdfBytes = await readFile(outputPath);
      const document = await PDFDocument.load(pdfBytes);
      assert.strictEqual(document.getPageCount(), 3);
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('生成されたPDFの各ページに正のサイズがある', async () => {
    const workspacePath = await setupWorkspace();

    try {
      const sourcePaths = await Promise.all([
        copyFixtureTo(workspacePath, 'a.png'),
        copyFixtureTo(workspacePath, 'b.png'),
      ]);
      const outputPath = path.join(workspacePath, 'result.pdf');

      await combineImagesToPdf({
        jobs: sourcePaths.map((sourcePath) => ({ sourcePath })),
        outputPath,
        workspacePath,
      });

      const document = await PDFDocument.load(await readFile(outputPath));
      assert.strictEqual(document.getPageCount(), 2);

      for (const page of document.getPages()) {
        const { width, height } = page.getSize();
        assert.ok(width > 0, 'page width should be positive');
        assert.ok(height > 0, 'page height should be positive');
      }
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('画像が0件の場合はエラー', async () => {
    const workspacePath = await setupWorkspace();

    try {
      await assert.rejects(
        combineImagesToPdf({
          jobs: [],
          outputPath: path.join(workspacePath, 'result.pdf'),
          workspacePath,
        }),
        /No images/,
      );
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('破損画像はpreflightで停止する', async () => {
    const workspacePath = await setupWorkspace();

    try {
      const sourcePath = path.join(workspacePath, 'bad.png');
      await writeFile(sourcePath, 'not a png');

      await assert.rejects(
        combineImagesToPdf({
          jobs: [{ sourcePath }],
          outputPath: path.join(workspacePath, 'result.pdf'),
          workspacePath,
        }),
        /Preflight validation failed/,
      );
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('Mermaid、Draw.io、PDFを仕様対象外として変換前に拒否する', async () => {
    const workspacePath = await setupWorkspace();

    try {
      for (const fileName of ['diagram.mmd', 'diagram.drawio.png', 'document.pdf']) {
        const sourcePath = path.join(workspacePath, fileName);
        await writeFile(sourcePath, 'unsupported');

        await assert.rejects(
          combineImagesToPdf({
            jobs: [{ sourcePath }],
            outputPath: path.join(workspacePath, `${fileName}.output.pdf`),
            workspacePath,
          }),
          /Unsupported image input:/,
        );
      }
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('workspace外の入力はpreflightで読み取る前に拒否する', async () => {
    const workspacePath = await setupWorkspace();
    const outsideDirectory = await setupWorkspace();

    try {
      const sourcePath = await copyFixtureTo(outsideDirectory, 'outside.png');

      await assert.rejects(
        combineImagesToPdf({
          jobs: [{ sourcePath }],
          outputPath: path.join(workspacePath, 'result.pdf'),
          workspacePath,
        }),
        /File operation is outside the workspace:/,
      );
    } finally {
      await Promise.all([
        rm(workspacePath, { recursive: true, force: true }),
        rm(outsideDirectory, { recursive: true, force: true }),
      ]);
    }
  });
});
