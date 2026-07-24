import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

import {
  convertToDrawioFiles,
  createDrawioXml,
  parseSvgSize,
} from '../../src/operations/conversion/convert_to_drawio.js';

suite('Draw.ioへの集約変換', () => {
  test('XML生成は画像を1オブジェクトにし、同名ページを連番化する', () => {
    const xml = createDrawioXml([
      { name: 'same', dataUri: 'data:image/png;base64,AA==', width: 10, height: 20 },
      { name: 'same', dataUri: 'data:image/svg+xml;base64,BB==', width: 30, height: 40 },
    ]);
    assert.match(xml, /name="same"/);
    assert.match(xml, /name="same-2"/);
    assert.strictEqual((xml.match(/shape=image/g) ?? []).length, 2);
  });

  test('SVGサイズはwidth/heightとviewBoxを判定する', () => {
    assert.deepStrictEqual(parseSvgSize('<svg width="12pt" height="8pt"/>'), { width: 12, height: 8 });
    assert.deepStrictEqual(parseSvgSize('<svg viewBox="0 0 640 480"/>'), { width: 640, height: 480 });
    assert.deepStrictEqual(parseSvgSize('<svg width="320" viewBox="0 0 640 480"/>'), { width: 320, height: 240 });
    assert.deepStrictEqual(parseSvgSize('<svg height="240" viewBox="0 0 640 480"/>'), { width: 320, height: 240 });
    assert.throws(() => parseSvgSize('<svg/>'), /dimensions/);
  });

  test('複数入力を1つへまとめ、PDFはページごとにSVG runnerを通す', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-to-drawio-'));
    try {
      const imagePath = path.join(workspacePath, 'image.png');
      const pdfPath = path.join(workspacePath, 'input.pdf');
      const outputPath = path.join(workspacePath, 'combined.drawio');
      await sharp({ create: { width: 20, height: 10, channels: 4, background: 'red' } })
        .png()
        .toFile(imagePath);
      const { PDFDocument } = await import('pdf-lib');
      const pdf = await PDFDocument.create();
      pdf.addPage([100, 50]);
      pdf.addPage([80, 40]);
      await writeFile(pdfPath, await pdf.save());
      const calls: number[] = [];
      await convertToDrawioFiles({
        jobs: [{ inputs: [{ sourcePath: imagePath }, { sourcePath: pdfPath }], outputPath, workspacePath }],
        drawioPath: 'drawio',
        ghostscriptPath: 'gs',
        runId: 'test',
        runPdfToSvg: async (_source, output, page) => {
          calls.push(page);
          await writeFile(output, '<svg width="100" height="50"/>');
        },
        runtime: { resolveConflicts: async () => 'overwrite' },
      });
      const xml = await readFile(outputPath, 'utf8');
      assert.deepStrictEqual(calls, [1, 2]);
      assert.strictEqual((xml.match(/shape=image/g) ?? []).length, 3);
      assert.match(xml, /data:image\/svg\+xml;base64/);
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('ラスターの全フレームをPNGデータURIへ正規化し、ページ寸法を設定する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-to-drawio-raster-frames-'));
    try {
      const red = await sharp({ create: { width: 20, height: 10, channels: 4, background: 'red' } })
        .png()
        .toBuffer();
      const blue = await sharp({ create: { width: 20, height: 10, channels: 4, background: 'blue' } })
        .png()
        .toBuffer();
      const inputs = [
        ['animated.gif', 'gif'],
        ['animated.webp', 'webp'],
        ['multipage.tiff', 'tiff'],
      ] as const;
      for (const [name, format] of inputs) {
        await sharp([red, blue], { join: { animated: true } })
          [format]()
          .toFile(path.join(workspacePath, name));
      }

      const outputPath = path.join(workspacePath, 'result.drawio');
      await convertToDrawioFiles({
        jobs: [
          {
            inputs: inputs.map(([name]) => ({ sourcePath: path.join(workspacePath, name) })),
            outputPath,
            workspacePath,
          },
        ],
        drawioPath: 'drawio',
        ghostscriptPath: 'gs',
        runId: 'raster-frames',
        runtime: { resolveConflicts: async () => 'overwrite' },
      });

      const xml = await readFile(outputPath, 'utf8');
      assert.strictEqual((xml.match(/shape=image/g) ?? []).length, 6);
      assert.strictEqual((xml.match(/data:image\/png;base64,/g) ?? []).length, 6);
      assert.strictEqual((xml.match(/pageWidth="20" pageHeight="10"/g) ?? []).length, 6);
      assert.strictEqual((xml.match(/<mxGeometry width="20" height="10"/g) ?? []).length, 6);
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('editable PNG/SVGは一時Draw.io XMLをDesktop CLIへexportする', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-to-drawio-editable-'));
    try {
      const imagePath = path.join(workspacePath, 'image.png');
      await sharp({ create: { width: 20, height: 10, channels: 4, background: 'red' } })
        .png()
        .toFile(imagePath);

      for (const extension of ['.dio.png', '.dio.svg']) {
        const outputPath = path.join(workspacePath, `result${extension}`);
        let call: { executable: string; args: string[] } | undefined;
        await convertToDrawioFiles({
          jobs: [{ inputs: [{ sourcePath: imagePath }], outputPath, workspacePath }],
          drawioPath: '/custom/drawio',
          ghostscriptPath: 'gs',
          runId: extension.slice(1),
          runDrawio: async (executable, args) => {
            call = { executable, args };
            await writeFile(args[args.indexOf('--output') + 1]!, 'exported');
          },
          runtime: { resolveConflicts: async () => 'overwrite' },
        });

        assert.strictEqual(call?.executable, '/custom/drawio');
        assert.deepStrictEqual(call?.args.slice(0, 6), [
          '--export',
          '--format',
          extension === '.dio.png' ? 'png' : 'svg',
          '--output',
          path.join(
            workspacePath,
            '.latex-graphics-helper',
            'convert-to-drawio',
            extension.slice(1),
            `result${extension.endsWith('.png') ? '.png' : '.svg'}`,
          ),
          '--embed-diagram',
        ]);
        assert.match(call?.args[6] ?? '', /source\.drawio$/);
        assert.strictEqual(await readFile(outputPath, 'utf8'), 'exported');
      }
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('editable画像のCLI失敗時は別形式へfallbackしない', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-to-drawio-failure-'));
    try {
      const imagePath = path.join(workspacePath, 'image.png');
      const outputPath = path.join(workspacePath, 'result.dio.png');
      await sharp({ create: { width: 20, height: 10, channels: 4, background: 'red' } })
        .png()
        .toFile(imagePath);

      await assert.rejects(
        convertToDrawioFiles({
          jobs: [{ inputs: [{ sourcePath: imagePath }], outputPath, workspacePath }],
          drawioPath: 'drawio',
          ghostscriptPath: 'gs',
          runId: 'failure',
          runDrawio: async () => {
            throw new Error('Draw.io export failed');
          },
          runtime: { resolveConflicts: async () => 'overwrite' },
        }),
        /Draw\.io export failed/,
      );
      await assert.rejects(readFile(outputPath));
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });
});
