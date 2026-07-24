// Test target:
// - editable Draw.io画像をAVIFへ変換するとき、Draw.io CLIへAVIF/JPEG直接出力を要求せずPDFを経由すること
// - PDFからAVIFへ変換するとき、PNGを中間形式に使うこと
//
// Not tested:
// - Draw.io CLI実体での変換
// - pdftocairo実体での変換
// - 画像内容のpixel完全一致

import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import sharp from 'sharp';

import { convertToAvifFiles } from '../../src/operations/conversion/convert_to_avif.js';

suite('AVIFに変換する処理', () => {
  test('編集可能なDraw.io画像はPDFとPNGを経由してAVIFへ変換する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-convert-to-avif-operation-'));

    try {
      const sourcePath = path.join(workspacePath, 'source.drawio.png');
      const outputPath = path.join(workspacePath, 'source', '1.avif');
      const drawioCalls: string[][] = [];
      const pdfToPngCalls: { sourcePath: string; outputPath: string; page: number }[] = [];
      await writeFile(sourcePath, 'editable drawio image placeholder');

      await convertToAvifFiles({
        jobs: [
          {
            sourcePath,
            outputPath,
            workspacePath,
            page: 1,
          },
        ],
        pdftocairoTools: { pdftocairoPath: 'pdftocairo' },
        ghostscriptTools: { ghostscriptPath: 'gs' },
        mermaidTools: {
          browserChannel: 'chrome',
          theme: 'default',
          backgroundColor: 'white',
        },
        drawioTools: {
          drawioPath: 'drawio',
          runDrawio: async (_executable, args) => {
            drawioCalls.push(args);
            const outputIndex = args.indexOf('-o') + 1;
            assert.ok(outputIndex > 0);
            await writeFile(args[outputIndex]!, '%PDF-1.7\n');
          },
        },
        avif: {
          effort: 0,
        },
        runPdfToPng: async (pdfPath, pngPath, page) => {
          pdfToPngCalls.push({ sourcePath: pdfPath, outputPath: pngPath, page });
          await sharp({
            create: {
              width: 12,
              height: 8,
              channels: 4,
              background: '#285078',
            },
          })
            .png()
            .toFile(pngPath);
        },
        runtime: {},
        runId: 'test-run',
      });

      assert.strictEqual(drawioCalls.length, 1);
      const drawioArgs = drawioCalls[0]!;
      const expectedPdfPath = path.join(
        workspacePath,
        '.latex-graphics-helper',
        'convert-to-avif',
        'test-run',
        '1',
        'drawio.pdf',
      );
      assert.deepStrictEqual(drawioArgs.slice(0, 5), ['-x', '-f', 'pdf', '-o', expectedPdfPath]);
      assert.strictEqual(drawioArgs.at(-1), sourcePath);

      assert.deepStrictEqual(pdfToPngCalls, [
        {
          sourcePath: expectedPdfPath,
          outputPath: path.join(
            workspacePath,
            '.latex-graphics-helper',
            'convert-to-avif',
            'test-run',
            '1',
            'source.png',
          ),
          page: 1,
        },
      ]);

      const buffer = await readFile(outputPath);
      const metadata = await sharp(buffer).metadata();
      assert.strictEqual(metadata.format, 'heif');
      assert.ok(metadata.width);
      assert.ok(metadata.height);
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });
});
