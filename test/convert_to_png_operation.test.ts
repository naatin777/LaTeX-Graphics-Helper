// Test target:
// - editable Draw.io画像をPNGへ変換するとき、Draw.io CLIへPNG出力を要求せずPDFを経由すること
// - Draw.io runnerを注入しても、最終出力は読み取り可能なPNGとして反映されること

import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

import { convertToPngFiles, type ConvertToPngJob, type DrawioToPngOptions } from '../src/operations/convert_to_png.js';

suite('PNGに変換する処理', () => {
  test('編集可能なDraw.io画像はPDFを経由してPNGへ変換する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-convert-to-png-'));

    try {
      const sourcePath = path.join(workspacePath, 'source.drawio.png');
      const outputPath = path.join(workspacePath, 'source.png');
      await writeFile(sourcePath, 'editable drawio image placeholder');
      const drawioCalls: string[][] = [];
      const drawio: DrawioToPngOptions = {
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
      const job: ConvertToPngJob = {
        sourcePath,
        outputPath,
        workspacePath,
        page: 1,
      };

      await convertToPngFiles({
        jobs: [job],
        pdftocairoPath: 'pdftocairo',
    ghostscriptPath: 'gs',
        mermaid: { browserChannel: 'chrome' },
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
      await assertReadablePng(outputPath);
    } finally {
      await rm(workspacePath, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });
});

async function assertReadablePng(filePath: string): Promise<void> {
  const metadata = await sharp(await readFile(filePath)).metadata();

  assert.strictEqual(metadata.format, 'png');
  assert.ok(metadata.width);
  assert.ok(metadata.width > 0);
  assert.ok(metadata.height);
  assert.ok(metadata.height > 0);
}
