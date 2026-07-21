/* oxlint-disable vitest/expect-expect */

import assert from 'node:assert/strict';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { PDFDocument } from 'pdf-lib';

import { combineImagesToPdf } from '../src/operations/combine_images_to_pdf.js';

const VALID_PNG = path.resolve('test', 'fixtures', 'test.png');

async function setupWorkspace(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'lgh-combine-'));
  return dir;
}

async function copyFixtureTo(workspacePath: string, name: string): Promise<string> {
  const dest = path.join(workspacePath, name);
  await copyFile(VALID_PNG, dest);
  return dest;
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
      const doc = await PDFDocument.load(pdfBytes);
      assert.strictEqual(doc.getPageCount(), 1);
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('複数のPNG画像を複数ページPDFに結合する', async () => {
    const workspacePath = await setupWorkspace();
    try {
      const src1 = await copyFixtureTo(workspacePath, 'a.png');
      const src2 = await copyFixtureTo(workspacePath, 'b.png');
      const src3 = await copyFixtureTo(workspacePath, 'c.png');
      const outputPath = path.join(workspacePath, 'result.pdf');

      await combineImagesToPdf({
        jobs: [{ sourcePath: src1 }, { sourcePath: src2 }, { sourcePath: src3 }],
        outputPath,
        workspacePath,
      });

      const pdfBytes = await readFile(outputPath);
      const doc = await PDFDocument.load(pdfBytes);
      assert.strictEqual(doc.getPageCount(), 3);
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('生成されたPDFの各ページに画像が含まれる', async () => {
    const workspacePath = await setupWorkspace();
    try {
      const src1 = await copyFixtureTo(workspacePath, 'a.png');
      const src2 = await copyFixtureTo(workspacePath, 'b.png');
      const outputPath = path.join(workspacePath, 'result.pdf');

      await combineImagesToPdf({
        jobs: [{ sourcePath: src1 }, { sourcePath: src2 }],
        outputPath,
        workspacePath,
      });

      const pdfBytes = await readFile(outputPath);
      const doc = await PDFDocument.load(pdfBytes);
      assert.strictEqual(doc.getPageCount(), 2);

      const pages = doc.getPages();
      for (const page of pages) {
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
      const badPath = path.join(workspacePath, 'bad.png');
      await writeFile(badPath, 'not a png');
      await assert.rejects(
        combineImagesToPdf({
          jobs: [{ sourcePath: badPath }],
          outputPath: path.join(workspacePath, 'result.pdf'),
          workspacePath,
        }),
        /Preflight validation failed/,
      );
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });
});
