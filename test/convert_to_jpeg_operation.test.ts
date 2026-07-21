// Test target:
// - editable Draw.io画像をJPEGへ変換するとき、Draw.io CLIへPDF出力を要求しPNG中間を経てJPEGへ変換すること
// - 最終出力が読み取り可能なJPEGとして反映されること

import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

import {
  convertToJpegFiles,
  type ConvertToJpegJob,
  type DrawioToJpegOptions,
} from '../src/operations/convert_to_jpeg.js';

suite('JPEGに変換する処理', () => {
  test('編集可能なDraw.io画像はPDFを経由してJPEGへ変換する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-convert-to-jpeg-'));

    try {
      const sourcePath = path.join(workspacePath, 'source.drawio.png');
      const outputPath = path.join(workspacePath, 'source.jpeg');
      await writeFile(sourcePath, 'editable drawio image placeholder');
      const drawioCalls: string[][] = [];
      const drawio: DrawioToJpegOptions = {
        drawioPath: 'drawio',
        runDrawio: async (_executable, args) => {
          drawioCalls.push(args);
          const outputFlagIndex = args.indexOf('-o');
          assert.ok(outputFlagIndex >= 0);
          const pdfPath = args[outputFlagIndex + 1];
          assert.ok(pdfPath);
          const document = await PDFDocument.create();
          document.addPage([32, 24]);
          await writeFile(pdfPath, await document.save());
        },
      };
      const job: ConvertToJpegJob = {
        sourcePath,
        outputPath,
        workspacePath,
        page: 1,
      };

      await convertToJpegFiles({
        jobs: [job],
        pdftocairoPath: 'pdftocairo',
    ghostscriptPath: 'gs',
        mermaid: { browserChannel: 'chrome',
            theme: 'default',
            backgroundColor: 'white' },
        drawio,
        runPdfToPng: async (pdfPath, pngPath, page) => {
          assert.ok(pdfPath.endsWith('.pdf'));
          assert.strictEqual(page, 1);
          await sharp({
            create: {
              width: 32,
              height: 24,
              channels: 4,
              background: '#285078',
            },
          })
            .png()
            .toFile(pngPath);
        },
        runtime: { resolveConflicts: async () => 'overwrite' },
      });

      assert.strictEqual(drawioCalls.length, 1);
      const args = drawioCalls[0]!;
      assert.strictEqual(args[0], '-x');
      assert.strictEqual(args[1], '-f');
      assert.strictEqual(args[2], 'pdf');
      assert.strictEqual(args[3], '-o');
      assert.ok(args[4]?.endsWith('.pdf'));
      assert.strictEqual(args[5], sourcePath);
      await assertReadableJpeg(outputPath);
    } finally {
      await rm(workspacePath, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });
});

async function assertReadableJpeg(filePath: string): Promise<void> {
  const metadata = await sharp(await readFile(filePath)).metadata();

  assert.strictEqual(metadata.format, 'jpeg');
  assert.ok(metadata.width);
  assert.ok(metadata.width > 0);
  assert.ok(metadata.height);
  assert.ok(metadata.height > 0);
}
