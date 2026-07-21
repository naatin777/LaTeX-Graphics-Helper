/* oxlint-disable vitest/expect-expect */

import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

import { convertPngToPdfFiles } from '../src/operations/convert_png_to_pdf.js';
import { convertToAvifFiles } from '../src/operations/convert_to_avif.js';
import { convertToJpegFiles } from '../src/operations/convert_to_jpeg.js';
import { convertToPngFiles } from '../src/operations/convert_to_png.js';
import { convertToSvgFiles } from '../src/operations/convert_to_svg.js';
import { convertToWebpFiles } from '../src/operations/convert_to_webp.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const EPS_FIXTURE = path.join(testDirectory, '..', '..', 'test', 'fixtures', 'eps', 'minimal.eps');

suite('EPSの出力経路', () => {
  test('EPSをPDFへ変換する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-eps-pdf-'));
    try {
      const sourcePath = path.join(workspacePath, 'input.eps');
      const outputPath = path.join(workspacePath, 'output.pdf');
      await writeFile(sourcePath, await readFile(EPS_FIXTURE));

      await convertPngToPdfFiles({
        jobs: [{ sourcePath, outputPath, workspacePath }],
        supportedExtensions: ['.eps'],
        ghostscriptPath: 'gs',
        operationName: 'test-eps',
      });

      const pdfBytes = await readFile(outputPath);
      const doc = await PDFDocument.load(pdfBytes);
      assert.ok(doc.getPageCount() >= 1, 'PDF should have at least 1 page');
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('EPSをPNGへ変換する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-eps-png-'));
    try {
      const sourcePath = path.join(workspacePath, 'input.eps');
      const outputPath = path.join(workspacePath, 'output.png');
      await writeFile(sourcePath, await readFile(EPS_FIXTURE));

      await convertToPngFiles({
        jobs: [{ sourcePath, outputPath, workspacePath }],
        pdftocairoPath: 'pdftocairo',
        ghostscriptPath: 'gs',
        mermaid: { browserChannel: 'chrome', theme: 'default', backgroundColor: 'white' },
        drawio: { drawioPath: 'drawio' },
        runtime: { resolveConflicts: async () => 'overwrite' as const },
      });

      const metadata = await sharp(outputPath).metadata();
      assert.ok(metadata.width && metadata.width > 0, 'PNG should have valid width');
      assert.ok(metadata.height && metadata.height > 0, 'PNG should have valid height');
      assert.strictEqual(metadata.format, 'png');
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('EPSをJPEGへ変換する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-eps-jpeg-'));
    try {
      const sourcePath = path.join(workspacePath, 'input.eps');
      const outputPath = path.join(workspacePath, 'output.jpeg');
      await writeFile(sourcePath, await readFile(EPS_FIXTURE));

      await convertToJpegFiles({
        jobs: [{ sourcePath, outputPath, workspacePath }],
        pdftocairoPath: 'pdftocairo',
        ghostscriptPath: 'gs',
        mermaid: { browserChannel: 'chrome', theme: 'default', backgroundColor: 'white' },
        drawio: { drawioPath: 'drawio' },
        runtime: { resolveConflicts: async () => 'overwrite' as const },
      });

      const metadata = await sharp(outputPath).metadata();
      assert.ok(metadata.width && metadata.width > 0, 'JPEG should have valid width');
      assert.strictEqual(metadata.format, 'jpeg');
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('EPSをWebPへ変換する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-eps-webp-'));
    try {
      const sourcePath = path.join(workspacePath, 'input.eps');
      const outputPath = path.join(workspacePath, 'output.webp');
      await writeFile(sourcePath, await readFile(EPS_FIXTURE));

      await convertToWebpFiles({
        jobs: [{ sourcePath, outputPath, workspacePath }],
        pdftocairoPath: 'pdftocairo',
        ghostscriptPath: 'gs',
        mermaid: { browserChannel: 'chrome', theme: 'default', backgroundColor: 'white' },
        drawio: { drawioPath: 'drawio' },
        webp: { effort: 0 },
        runtime: { resolveConflicts: async () => 'overwrite' as const },
      });

      const metadata = await sharp(outputPath).metadata();
      assert.ok(metadata.width && metadata.width > 0, 'WebP should have valid width');
      assert.strictEqual(metadata.format, 'webp');
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('EPSをAVIFへ変換する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-eps-avif-'));
    try {
      const sourcePath = path.join(workspacePath, 'input.eps');
      const outputPath = path.join(workspacePath, 'output.avif');
      await writeFile(sourcePath, await readFile(EPS_FIXTURE));

      await convertToAvifFiles({
        jobs: [{ sourcePath, outputPath, workspacePath }],
        pdftocairoPath: 'pdftocairo',
        ghostscriptPath: 'gs',
        mermaid: { browserChannel: 'chrome', theme: 'default', backgroundColor: 'white' },
        drawio: { drawioPath: 'drawio' },
        avif: { effort: 0 },
        runtime: { resolveConflicts: async () => 'overwrite' as const },
      });

      const metadata = await sharp(outputPath).metadata();
      assert.ok(metadata.width && metadata.width > 0, 'AVIF should have valid width');
      assert.strictEqual(metadata.format, 'heif');
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('EPSをSVGへ変換する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-eps-svg-'));
    try {
      const sourcePath = path.join(workspacePath, 'input.eps');
      const outputPath = path.join(workspacePath, 'output.svg');
      await writeFile(sourcePath, await readFile(EPS_FIXTURE));

      await convertToSvgFiles({
        jobs: [{ sourcePath, outputPath, workspacePath }],
        pdftocairoPath: 'pdftocairo',
        ghostscriptPath: 'gs',
        mermaid: { browserChannel: 'chrome', theme: 'default', backgroundColor: 'white' },
        drawio: { drawioPath: 'drawio' },
        runId: 'test-run',
        resolveOutputConflicts: async () => 'overwrite' as const,
      });

      const svgContent = await readFile(outputPath, 'utf8');
      assert.ok(svgContent.includes('<svg'), 'SVG output should contain <svg> element');
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('不正なEPSはpreflightで変換前に停止する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-eps-bad-'));
    try {
      const sourcePath = path.join(workspacePath, 'bad.eps');
      const outputPath = path.join(workspacePath, 'output.pdf');
      await writeFile(sourcePath, 'NOT AN EPS FILE');

      await assert.rejects(
        convertPngToPdfFiles({
          jobs: [{ sourcePath, outputPath, workspacePath }],
          supportedExtensions: ['.eps'],
          ghostscriptPath: 'gs',
          operationName: 'test-eps',
        }),
        /Preflight validation failed/,
      );
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });
});
