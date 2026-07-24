// Test target:
// - WindowsのPDF変換routeがUnicode論理入力をASCII scratchへcopyしてpdftocairo相当runnerへ渡すこと
// - PNG、JPEG、WebP、AVIF、SVGの論理出力名と出力形式を維持すること
// - 期待pathと異なる別名出力や0 byte出力を成功扱いしないこと
//
// Mocked:
// - pdftocairoのprocess実行とPNG/SVG出力
// - Windows platformとscratch base候補
//
// Not tested:
// - pdftocairo実体のWindows path互換性（3 OSの実体probeで別に確認済み）
// - VS Code command UI、Safe Modeの選択肢、Undo
// - Ghostscriptとrsvg-convert

import assert from 'node:assert/strict';
import { constants } from 'node:fs';
import { access, copyFile, mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { convertToAvifFiles } from '../../src/operations/conversion/convert_to_avif.js';
import { convertToJpegFiles } from '../../src/operations/conversion/convert_to_jpeg.js';
import { convertToPngFiles } from '../../src/operations/conversion/convert_to_png.js';
import { convertToSvgFiles } from '../../src/operations/conversion/convert_to_svg.js';
import { convertToWebpFiles } from '../../src/operations/conversion/convert_to_webp.js';

const compiledTestDirectory = path.dirname(fileURLToPath(import.meta.url));
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
const pngFixturePath = path.resolve(compiledTestDirectory, '..', '..', '..', 'test', 'fixtures', 'test.png');
const svgFixturePath = path.resolve(
  compiledTestDirectory,
  '..',
  '..',
  '..',
  'test',
  'fixtures',
  'path-compatibility',
  'source.svg',
);
const complexSourceFileName =
  '　日本語 English 한국어 中文 العربية हिन्दी ไทย עברית Ελληνικά Русский 🌹 ＡＢＣ１２３①.pdf';

interface WindowsScratchOptions {
  platform: NodeJS.Platform;
  scratchBaseCandidates: readonly string[];
}

type ConvertToPngFilesWithScratch = (
  options: Parameters<typeof convertToPngFiles>[0] & WindowsScratchOptions,
) => ReturnType<typeof convertToPngFiles>;
type ConvertToJpegFilesWithScratch = (
  options: Parameters<typeof convertToJpegFiles>[0] & WindowsScratchOptions,
) => ReturnType<typeof convertToJpegFiles>;
type ConvertToWebpFilesWithScratch = (
  options: Parameters<typeof convertToWebpFiles>[0] & WindowsScratchOptions,
) => ReturnType<typeof convertToWebpFiles>;
type ConvertToAvifFilesWithScratch = (
  options: Parameters<typeof convertToAvifFiles>[0] & WindowsScratchOptions,
) => ReturnType<typeof convertToAvifFiles>;
type ConvertToSvgFilesWithScratch = (
  options: Parameters<typeof convertToSvgFiles>[0] & WindowsScratchOptions,
) => ReturnType<typeof convertToSvgFiles>;

// Implementation Phaseで追加するplatform・scratch候補の注入契約を、失敗テストでも型安全に呼ぶ。
const convertToPngFilesWithScratch = convertToPngFiles as ConvertToPngFilesWithScratch;
const convertToJpegFilesWithScratch = convertToJpegFiles as ConvertToJpegFilesWithScratch;
const convertToWebpFilesWithScratch = convertToWebpFiles as ConvertToWebpFilesWithScratch;
const convertToAvifFilesWithScratch = convertToAvifFiles as ConvertToAvifFilesWithScratch;
const convertToSvgFilesWithScratch = convertToSvgFiles as ConvertToSvgFilesWithScratch;

type RunPdfTool = (sourcePath: string, outputPath: string, page: number, signal?: AbortSignal) => Promise<void>;

interface ConversionContext {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
  scratchBasePath: string;
}

interface PdfConversionRoute {
  label: string;
  outputExtension: string;
  toolOutputFileName: 'output.png' | 'output.svg';
  convert: (context: ConversionContext, runPdfTool: RunPdfTool) => Promise<void>;
  assertOutput: (outputPath: string) => Promise<void>;
}

const routes: readonly PdfConversionRoute[] = [
  {
    label: 'PNG',
    outputExtension: '.png',
    toolOutputFileName: 'output.png',
    convert: async (context, runPdfTool) => {
      await convertToPngFilesWithScratch({
        jobs: [createJob(context)],
        pdftocairoTools: { pdftocairoPath: 'pdftocairo' },
        ghostscriptTools: { ghostscriptPath: 'gs' },
        mermaidTools: { browserChannel: 'chrome', theme: 'default', backgroundColor: 'white' },
        drawioTools: { drawioPath: 'drawio' },
        runPdfToPng: runPdfTool,
        runtime: {},
        runId: 'windows-pdftocairo-png',
        scratchBaseCandidates: [context.scratchBasePath],
      });
    },
    assertOutput: (outputPath) => assertRasterFormat(outputPath, 'png'),
  },
  {
    label: 'JPEG',
    outputExtension: '.jpeg',
    toolOutputFileName: 'output.png',
    convert: async (context, runPdfTool) => {
      await convertToJpegFilesWithScratch({
        jobs: [createJob(context)],
        pdftocairoTools: { pdftocairoPath: 'pdftocairo' },
        ghostscriptTools: { ghostscriptPath: 'gs' },
        mermaidTools: { browserChannel: 'chrome', theme: 'default', backgroundColor: 'white' },
        drawioTools: { drawioPath: 'drawio' },
        runPdfToPng: runPdfTool,
        runtime: {},
        runId: 'windows-pdftocairo-jpeg',
        scratchBaseCandidates: [context.scratchBasePath],
      });
    },
    assertOutput: (outputPath) => assertRasterFormat(outputPath, 'jpeg'),
  },
  {
    label: 'WebP',
    outputExtension: '.webp',
    toolOutputFileName: 'output.png',
    convert: async (context, runPdfTool) => {
      await convertToWebpFilesWithScratch({
        jobs: [createJob(context)],
        pdftocairoTools: { pdftocairoPath: 'pdftocairo' },
        ghostscriptTools: { ghostscriptPath: 'gs' },
        mermaidTools: { browserChannel: 'chrome', theme: 'default', backgroundColor: 'white' },
        drawioTools: { drawioPath: 'drawio' },
        webp: { effort: 0 },
        runPdfToPng: runPdfTool,
        runtime: {},
        runId: 'windows-pdftocairo-webp',
        scratchBaseCandidates: [context.scratchBasePath],
      });
    },
    assertOutput: (outputPath) => assertRasterFormat(outputPath, 'webp'),
  },
  {
    label: 'AVIF',
    outputExtension: '.avif',
    toolOutputFileName: 'output.png',
    convert: async (context, runPdfTool) => {
      await convertToAvifFilesWithScratch({
        jobs: [createJob(context)],
        pdftocairoTools: { pdftocairoPath: 'pdftocairo' },
        ghostscriptTools: { ghostscriptPath: 'gs' },
        mermaidTools: { browserChannel: 'chrome', theme: 'default', backgroundColor: 'white' },
        drawioTools: { drawioPath: 'drawio' },
        avif: { effort: 0 },
        runPdfToPng: runPdfTool,
        runtime: {},
        runId: 'windows-pdftocairo-avif',
        scratchBaseCandidates: [context.scratchBasePath],
      });
    },
    assertOutput: (outputPath) => assertRasterFormat(outputPath, 'heif'),
  },
  {
    label: 'SVG',
    outputExtension: '.svg',
    toolOutputFileName: 'output.svg',
    convert: async (context, runPdfTool) => {
      await convertToSvgFilesWithScratch({
        jobs: [createJob(context)],
        pdftocairoTools: { pdftocairoPath: 'pdftocairo' },
        ghostscriptTools: { ghostscriptPath: 'gs' },
        mermaidTools: { browserChannel: 'chrome', theme: 'default', backgroundColor: 'white' },
        drawioTools: { drawioPath: 'drawio' },
        runPdfToSvg: runPdfTool,
        runId: 'windows-pdftocairo-svg',
        scratchBaseCandidates: [context.scratchBasePath],
      });
    },
    assertOutput: assertSvgOutput,
  },
];

suite('Windows pdftocairo ASCII scratch', () => {
  for (const route of routes) {
    test(`Unicode論理pathを維持して${route.label}へ変換し、成功後にscratchを削除する`, async () => {
      const paths = await prepareFixedFixtureWorkspace(route.outputExtension);
      let toolInputPath: string | undefined;
      let toolOutputPath: string | undefined;

      try {
        const sourceBytes = await readFile(paths.sourcePath);

        await route.convert(paths, async (sourcePath, outputPath, page) => {
          toolInputPath = sourcePath;
          toolOutputPath = outputPath;
          assert.strictEqual(page, 1);
          assertAsciiToolPaths(sourcePath, outputPath, route.toolOutputFileName, paths);
          assert.deepStrictEqual(await readFile(sourcePath), sourceBytes);
          await writeToolFixture(outputPath);
        });

        const requiredInputPath = requiredPath(toolInputPath, 'tool入力path');
        const requiredOutputPath = requiredPath(toolOutputPath, 'tool出力path');
        await route.assertOutput(paths.outputPath);
        assert.deepStrictEqual(await readFile(paths.sourcePath), sourceBytes);
        await assertFileDoesNotExist(requiredInputPath);
        await assertFileDoesNotExist(requiredOutputPath);
      } finally {
        await rm(paths.testRootPath, { recursive: true, force: true });
      }
    });
  }

  test('期待pathと異なる別名PNGを成功扱いせず、論理出力を作らない', async () => {
    const paths = await prepareFixedFixtureWorkspace('.png');
    let unexpectedOutputPath: string | undefined;

    try {
      await assert.rejects(
        routes[0]!.convert(paths, async (sourcePath, outputPath) => {
          assert.strictEqual(path.extname(sourcePath), '.pdf');
          unexpectedOutputPath = path.join(path.dirname(outputPath), 'output-garbled.png');
          await copyFile(pngFixturePath, unexpectedOutputPath);
        }),
      );

      const requiredUnexpectedPath = requiredPath(unexpectedOutputPath, '別名tool出力path');
      assert.strictEqual(isPathInside(paths.scratchBasePath, requiredUnexpectedPath), true);
      await access(requiredUnexpectedPath, constants.F_OK);
      await assertFileDoesNotExist(paths.outputPath);
    } finally {
      await rm(paths.testRootPath, { recursive: true, force: true });
    }
  });

  test('期待pathの0 byte PNGを成功扱いせず、論理出力を作らない', async () => {
    const paths = await prepareFixedFixtureWorkspace('.png');
    let toolOutputPath: string | undefined;

    try {
      await assert.rejects(
        routes[0]!.convert(paths, async (sourcePath, outputPath) => {
          toolOutputPath = outputPath;
          assert.strictEqual(path.extname(sourcePath), '.pdf');
          await writeFile(outputPath, Buffer.alloc(0));
        }),
      );

      const requiredOutputPath = requiredPath(toolOutputPath, '0 byte tool出力path');
      assert.strictEqual((await stat(requiredOutputPath)).size, 0);
      await assertFileDoesNotExist(paths.outputPath);
    } finally {
      await rm(paths.testRootPath, { recursive: true, force: true });
    }
  });
});

interface FixedFixtureWorkspace extends ConversionContext {
  testRootPath: string;
}

async function prepareFixedFixtureWorkspace(outputExtension: string): Promise<FixedFixtureWorkspace> {
  const testRootPath = await mkdtemp(path.join(os.tmpdir(), 'lgh-pdftocairo-scratch-test-'));
  const workspacePath = path.join(testRootPath, 'workspace 日本語 हिन्दी 🌹');
  const scratchBasePath = path.join(testRootPath, 'scratch');
  const sourcePath = path.join(workspacePath, complexSourceFileName);
  const outputPath = path.join(workspacePath, `結果 한국어 العربية 🌹　ＡＢＣ①${outputExtension}`);

  await Promise.all([mkdir(workspacePath, { recursive: true }), mkdir(scratchBasePath, { recursive: true })]);
  await copyFile(pdfFixturePath, sourcePath);

  return {
    testRootPath,
    workspacePath,
    scratchBasePath: await realpath(scratchBasePath),
    sourcePath,
    outputPath,
  };
}

function createJob(context: ConversionContext) {
  return {
    sourcePath: context.sourcePath,
    outputPath: context.outputPath,
    workspacePath: context.workspacePath,
    page: 1,
  };
}

function assertAsciiToolPaths(
  toolInputPath: string,
  toolOutputPath: string,
  expectedOutputFileName: 'output.png' | 'output.svg',
  paths: FixedFixtureWorkspace,
): void {
  assert.strictEqual(path.basename(toolInputPath), 'input.pdf');
  assert.strictEqual(path.basename(toolOutputPath), expectedOutputFileName);
  assert.match(toolInputPath, /^[\x20-\x7e]+$/u);
  assert.match(toolOutputPath, /^[\x20-\x7e]+$/u);
  assert.strictEqual(path.dirname(toolInputPath), path.dirname(toolOutputPath));
  assert.strictEqual(isPathInside(paths.scratchBasePath, toolInputPath), true);
  assert.strictEqual(isPathInside(paths.scratchBasePath, toolOutputPath), true);
  assert.strictEqual(isPathInside(paths.workspacePath, toolInputPath), false);
  assert.strictEqual(isPathInside(paths.workspacePath, toolOutputPath), false);

  if (expectedOutputFileName === 'output.png') {
    const outputPrefix = toolOutputPath.slice(0, -path.extname(toolOutputPath).length);
    assert.strictEqual(path.basename(outputPrefix), 'output');
  }
}

async function writeToolFixture(outputPath: string): Promise<void> {
  if (path.extname(outputPath) === '.svg') {
    await copyFile(svgFixturePath, outputPath);
    return;
  }

  await copyFile(pngFixturePath, outputPath);
}

async function assertRasterFormat(filePath: string, expectedFormat: string): Promise<void> {
  const buffer = await readFile(filePath);
  const metadata = await sharp(buffer).metadata();

  assert.strictEqual(metadata.format, expectedFormat);
  assert.ok(metadata.width);
  assert.ok(metadata.width > 0);
  assert.ok(metadata.height);
  assert.ok(metadata.height > 0);
}

async function assertSvgOutput(filePath: string): Promise<void> {
  assert.match(await readFile(filePath, 'utf8'), /<svg[\s>]/u);
}

function requiredPath(filePath: string | undefined, label: string): string {
  assert.ok(filePath, `${label}が記録されること`);
  return filePath;
}

function isPathInside(parentPath: string, childPath: string): boolean {
  const relativePath = path.relative(parentPath, childPath);
  return (
    relativePath === '' ||
    (relativePath !== '..' && !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath))
  );
}

async function assertFileDoesNotExist(filePath: string): Promise<void> {
  await assert.rejects(access(filePath, constants.F_OK), (error) => {
    return error instanceof Error && 'code' in error && error.code === 'ENOENT';
  });
}
