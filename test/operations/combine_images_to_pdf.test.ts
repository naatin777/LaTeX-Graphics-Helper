import assert from 'node:assert/strict';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import * as vscode from 'vscode';

import { readGhostscriptExecutablePath } from '../../src/config/external_tools/external_tool_paths.js';
import { combineImagesToPdf } from '../../src/operations/conversion/combine_images_to_pdf.js';
import type { SvgToPdfOptions } from '../../src/operations/conversion/convert_to_pdf.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const VALID_PNG = path.join(testDirectory, '..', '..', '..', 'test', 'fixtures', 'test.png');
const EPS_FIXTURE = path.join(testDirectory, '..', '..', '..', 'test', 'fixtures', 'eps', 'minimal.eps');
const GHOSTSCRIPT_PATH = readGhostscriptExecutablePath(vscode.workspace.getConfiguration('latex-graphics-helper'));

const supportedInputFixtures = [
  { format: 'png', width: 370, height: 370 },
  { format: 'jpeg', width: 11, height: 7 },
  { format: 'webp', width: 13, height: 9 },
  { format: 'avif', width: 17, height: 11 },
  { format: 'gif', width: 19, height: 13 },
  { format: 'tiff', width: 23, height: 15 },
  { format: 'svg', width: 29, height: 17 },
  { format: 'eps', width: 100, height: 100 },
] as const;

type SupportedInputFormat = (typeof supportedInputFixtures)[number]['format'];

interface InputFixture {
  format: SupportedInputFormat;
  sourcePath: string;
  width: number;
  height: number;
}

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

  test('設定したRaster入力pixel上限をpreflightと変換に適用する', async () => {
    const workspacePath = await setupWorkspace();

    try {
      const sourcePath = await copyFixtureTo(workspacePath, 'input.png');
      const outputPath = path.join(workspacePath, 'result.pdf');

      await assert.rejects(
        combineImagesToPdf({
          jobs: [{ sourcePath }],
          outputPath,
          workspacePath,
          maxInputPixels: 99,
        }),
        /configured raster input pixel limit/u,
      );
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
      const progress: Array<[number, number]> = [];

      await combineImagesToPdf({
        jobs: sourcePaths.map((sourcePath) => ({ sourcePath })),
        outputPath,
        workspacePath,
        runtime: { reportProgress: (completed, total) => progress.push([completed, total]) },
      });

      const pdfBytes = await readFile(outputPath);
      const document = await PDFDocument.load(pdfBytes);
      assert.strictEqual(document.getPageCount(), 3);
      assert.deepStrictEqual(progress, [
        [1, 3],
        [2, 3],
        [3, 3],
      ]);
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

  test('SVGは設定したrsvg backendを使い、ページサイズをpixel=pointへ正規化する', async () => {
    const workspacePath = await setupWorkspace();

    try {
      const sourcePath = path.join(workspacePath, 'source.svg');
      const outputPath = path.join(workspacePath, 'result.pdf');
      await writeFile(
        sourcePath,
        '<svg xmlns="http://www.w3.org/2000/svg" width="31" height="19" viewBox="0 0 31 19"><rect width="31" height="19" /></svg>',
      );

      const sourcePdf = await PDFDocument.create();
      sourcePdf.addPage([7, 11]);
      const calls: string[][] = [];
      const svgToPdf: SvgToPdfOptions = {
        engine: 'rsvg-convert',
        rsvgConvertPath: 'configured-rsvg-convert',
        puppeteerBrowser: 'chrome',
        puppeteerBrowserChannel: 'chrome',
        runRsvgConvert: async (executable, args) => {
          calls.push([executable, ...args]);
          const outputArgumentIndex = args.indexOf('--output') + 1;
          const stagedPath = args[outputArgumentIndex];
          assert.ok(stagedPath);
          await writeFile(stagedPath, await sourcePdf.save());
        },
      };

      await combineImagesToPdf({
        jobs: [{ sourcePath }],
        outputPath,
        workspacePath,
        svgToPdf,
        platform: 'linux',
      });

      const outputDocument = await PDFDocument.load(await readFile(outputPath));
      assert.deepStrictEqual(outputDocument.getPage(0).getSize(), { width: 31, height: 19 });
      assert.deepStrictEqual(calls[0]?.slice(0, 3), ['configured-rsvg-convert', '--format=pdf', '--output']);
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('対応する全入力形式がそれぞれ1ページを寄与する', async () => {
    const workspacePath = await setupWorkspace();

    try {
      const fixtures = await writeSupportedInputFixtures(workspacePath);

      for (const fixture of fixtures) {
        const outputPath = path.join(workspacePath, `${fixture.format}-result.pdf`);

        await combineImagesToPdf({
          jobs: [{ sourcePath: fixture.sourcePath }],
          outputPath,
          workspacePath,
          ghostscriptPath: GHOSTSCRIPT_PATH,
          svgToPdf: createStubSvgToPdfOptions(),
          platform: process.platform,
        });

        await assertPdfPageSizes(outputPath, [fixture]);
      }
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('全対応形式の混在バッチが入力順と各ページサイズを保持する', async () => {
    const workspacePath = await setupWorkspace();

    try {
      const fixtures = await writeSupportedInputFixtures(workspacePath);
      const outputPath = path.join(workspacePath, 'mixed-result.pdf');

      await combineImagesToPdf({
        jobs: fixtures.map((fixture) => ({ sourcePath: fixture.sourcePath })),
        outputPath,
        workspacePath,
        ghostscriptPath: GHOSTSCRIPT_PATH,
        svgToPdf: createStubSvgToPdfOptions(),
        platform: process.platform,
      });

      await assertPdfPageSizes(outputPath, fixtures);
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

async function writeSupportedInputFixtures(workspacePath: string): Promise<InputFixture[]> {
  const fixtures: InputFixture[] = [];

  for (const fixture of supportedInputFixtures) {
    const sourcePath = path.join(workspacePath, `source-${fixture.format}.${fixture.format}`);

    if (fixture.format === 'png') {
      await copyFile(VALID_PNG, sourcePath);
    } else if (fixture.format === 'jpeg' || fixture.format === 'webp' || fixture.format === 'avif') {
      await writeRasterFixture(sourcePath, fixture.format, fixture.width, fixture.height);
    } else if (fixture.format === 'gif' || fixture.format === 'tiff') {
      await writeAnimatedImageFixture(sourcePath, fixture.format, fixture.width, fixture.height);
    } else if (fixture.format === 'svg') {
      await writeFile(
        sourcePath,
        `<svg xmlns="http://www.w3.org/2000/svg" width="${fixture.width}" height="${fixture.height}" viewBox="0 0 ${fixture.width} ${fixture.height}"><rect width="${fixture.width}" height="${fixture.height}" /></svg>`,
      );
    } else {
      await copyFile(EPS_FIXTURE, sourcePath);
    }

    fixtures.push({ ...fixture, sourcePath });
  }

  return fixtures;
}

async function writeRasterFixture(
  filePath: string,
  format: 'jpeg' | 'webp' | 'avif',
  width: number,
  height: number,
): Promise<void> {
  const image = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 40, g: 80, b: 120 },
    },
  });

  if (format === 'jpeg') {
    await image.jpeg().toFile(filePath);
  } else if (format === 'webp') {
    await image.webp().toFile(filePath);
  } else {
    await image.avif().toFile(filePath);
  }
}

async function writeAnimatedImageFixture(
  filePath: string,
  format: 'gif' | 'tiff',
  width: number,
  height: number,
): Promise<void> {
  const red = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  const blue = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const output = sharp([red, blue], { join: { animated: true } });
  await (format === 'gif' ? output.gif() : output.tiff()).toFile(filePath);
}

function createStubSvgToPdfOptions(): SvgToPdfOptions {
  return {
    engine: 'rsvg-convert',
    rsvgConvertPath: 'configured-rsvg-convert',
    puppeteerBrowser: 'chrome',
    puppeteerBrowserChannel: 'chrome',
    runRsvgConvert: async (_executable, args) => {
      const outputArgumentIndex = args.indexOf('--output') + 1;
      const outputPath = args[outputArgumentIndex];
      assert.ok(outputPath);

      const sourcePdf = await PDFDocument.create();
      sourcePdf.addPage([1, 1]);
      await writeFile(outputPath, await sourcePdf.save());
    },
  };
}

async function assertPdfPageSizes(pdfPath: string, fixtures: InputFixture[]): Promise<void> {
  const document = await PDFDocument.load(await readFile(pdfPath));
  assert.strictEqual(document.getPageCount(), fixtures.length);

  for (const [index, fixture] of fixtures.entries()) {
    const page = document.getPage(index);
    assert.deepStrictEqual(page.getSize(), { width: fixture.width, height: fixture.height });
  }
}
