// Test target:
// - WindowsのSVG→PDF routeがUnicode論理入力をASCII scratchへcopyしてrsvg-convert相当runnerへ渡すこと
// - rsvg-convert相当runnerの出力を論理outputPathへ反映すること
// - 期待pathと異なる別名出力や0 byte出力を成功扱いしないこと
//
// Mocked:
// - rsvg-convertのprocess実行とPDF出力
// - Windows platformとscratch base候補
//
// Not tested:
// - rsvg-convert実体のWindows path互換性（GitHub Actionsの実体経路で別に確認する）
// - Puppeteer engine、pdftocairo、Ghostscript、Draw.io、Safe Mode、UI操作

import assert from 'node:assert/strict';
import { constants } from 'node:fs';
import { access, copyFile, mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PDFDocument } from 'pdf-lib';

import { convertToPdfFiles, type ConvertToPdfFilesOptions } from '../../src/operations/conversion/convert_to_pdf.js';
import type { SvgToPdfTools } from '../../src/operations/conversion/tools/index.js';

const compiledTestDirectory = path.dirname(fileURLToPath(import.meta.url));
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
const complexSourceFileName =
  '　日本語 English 한국어 中文 العربية हिन्दी ไทย עברית Ελληνικά Русский 🌹 ＡＢＣ１２３①.svg';
const complexOutputFileName = '結果 한국어 العربية हिन्दी ไทย עברית Ελληνικά Русский 🌹　ＡＢＣ①.pdf';

interface WindowsScratchOptions {
  platform: NodeJS.Platform;
  scratchBaseCandidates: readonly string[];
}

type RunRsvgConvert = (executable: string, args: string[], signal?: AbortSignal) => Promise<void>;

interface RsvgToPdfOptions extends SvgToPdfTools {
  runRsvgConvert: RunRsvgConvert;
}

type ConvertToPdfFilesWithScratch = (
  options: ConvertToPdfFilesOptions &
    WindowsScratchOptions & {
      svgToPdfTools: RsvgToPdfOptions;
    },
) => ReturnType<typeof convertToPdfFiles>;

// Implementation Phaseで追加するplatform・scratch・runnerの注入契約を、失敗テストでも型安全に呼ぶ。
const convertToPdfFilesWithScratch = convertToPdfFiles as ConvertToPdfFilesWithScratch;

interface FixedFixtureWorkspace {
  testRootPath: string;
  workspacePath: string;
  scratchBasePath: string;
  sourcePath: string;
  outputPath: string;
}

suite('Windows rsvg-convert ASCII scratch', () => {
  test('Unicode論理pathを維持してPDFへ変換し、成功後にscratchを削除する', async () => {
    const paths = await prepareFixedFixtureWorkspace();
    let toolInputPath: string | undefined;
    let toolOutputPath: string | undefined;

    try {
      const sourceBytes = await readFile(paths.sourcePath);
      const pdfBytes = await readFile(pdfFixturePath);

      await convertToPdfFilesWithScratch({
        jobs: [createJob(paths)],
        supportedExtensions: ['.svg'],
        svgToPdfTools: createSvgToPdfOptions(async (executable, args) => {
          toolInputPath = assertRsvgToolPaths(executable, args, paths);
          toolOutputPath = outputPathFromArgs(args);
          assert.deepStrictEqual(await readFile(toolInputPath), sourceBytes);
          await writeFile(toolOutputPath, pdfBytes);
        }),
        platform: 'win32',
        scratchBaseCandidates: [paths.scratchBasePath],
        runId: 'windows-rsvg-pdf',
      });

      const requiredInputPath = requiredPath(toolInputPath, 'tool入力path');
      const requiredOutputPath = requiredPath(toolOutputPath, 'tool出力path');
      await assertReadablePdf(paths.outputPath);
      assert.deepStrictEqual(await readFile(paths.sourcePath), sourceBytes);
      await assertFileDoesNotExist(requiredInputPath);
      await assertFileDoesNotExist(requiredOutputPath);
    } finally {
      await rm(paths.testRootPath, { recursive: true, force: true });
    }
  });

  test('期待pathと異なる別名PDFを成功扱いせず、論理出力を作らない', async () => {
    const paths = await prepareFixedFixtureWorkspace();
    let unexpectedOutputPath: string | undefined;

    try {
      await assert.rejects(
        convertToPdfFilesWithScratch({
          jobs: [createJob(paths)],
          supportedExtensions: ['.svg'],
          svgToPdfTools: createSvgToPdfOptions(async (_executable, args) => {
            const outputPath = outputPathFromArgs(args);
            unexpectedOutputPath = path.join(path.dirname(outputPath), 'output-garbled.pdf');
            await copyFile(pdfFixturePath, unexpectedOutputPath);
          }),
          platform: 'win32',
          scratchBaseCandidates: [paths.scratchBasePath],
          runId: 'windows-rsvg-alias',
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

  test('期待pathの0 byte PDFを成功扱いせず、論理出力を作らない', async () => {
    const paths = await prepareFixedFixtureWorkspace();
    let toolOutputPath: string | undefined;

    try {
      await assert.rejects(
        convertToPdfFilesWithScratch({
          jobs: [createJob(paths)],
          supportedExtensions: ['.svg'],
          svgToPdfTools: createSvgToPdfOptions(async (_executable, args) => {
            toolOutputPath = outputPathFromArgs(args);
            await writeFile(toolOutputPath, Buffer.alloc(0));
          }),
          platform: 'win32',
          scratchBaseCandidates: [paths.scratchBasePath],
          runId: 'windows-rsvg-empty',
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

function createSvgToPdfOptions(runRsvgConvert: RunRsvgConvert): RsvgToPdfOptions {
  return {
    engine: 'rsvg-convert',
    rsvgConvertPath: 'rsvg-convert',
    puppeteerBrowser: 'chrome',
    puppeteerBrowserChannel: 'chrome',
    runRsvgConvert,
  };
}

function createJob(paths: FixedFixtureWorkspace) {
  return {
    sourcePath: paths.sourcePath,
    outputPath: paths.outputPath,
    workspacePath: paths.workspacePath,
  };
}

function assertRsvgToolPaths(executable: string, args: string[], paths: FixedFixtureWorkspace): string {
  assert.strictEqual(executable, 'rsvg-convert');
  assert.strictEqual(args[0], '--format=pdf');
  assert.strictEqual(args[1], '--output');

  const inputPath = args[3];
  const outputPath = args[2];
  assert.ok(inputPath);
  assert.ok(outputPath);
  assert.strictEqual(path.basename(inputPath), 'input.svg');
  assert.strictEqual(path.basename(outputPath), 'output.pdf');
  assert.match(inputPath, /^[\x20-\x7e]+$/u);
  assert.match(outputPath, /^[\x20-\x7e]+$/u);
  assert.strictEqual(path.dirname(inputPath), path.dirname(outputPath));
  assert.strictEqual(isPathInside(paths.scratchBasePath, inputPath), true);
  assert.strictEqual(isPathInside(paths.scratchBasePath, outputPath), true);
  assert.strictEqual(isPathInside(paths.workspacePath, inputPath), false);
  assert.strictEqual(isPathInside(paths.workspacePath, outputPath), false);

  return inputPath;
}

function outputPathFromArgs(args: string[]): string {
  const outputPath = args[2];
  assert.ok(outputPath);
  return outputPath;
}

async function prepareFixedFixtureWorkspace(): Promise<FixedFixtureWorkspace> {
  const testRootPath = await mkdtemp(path.join(os.tmpdir(), 'lgh-rsvg-scratch-test-'));
  const workspacePath = path.join(testRootPath, 'workspace 日本語 हिन्दी 🌹');
  const scratchBasePath = path.join(testRootPath, 'scratch');
  const sourcePath = path.join(workspacePath, complexSourceFileName);
  const outputPath = path.join(workspacePath, complexOutputFileName);

  await Promise.all([mkdir(workspacePath, { recursive: true }), mkdir(scratchBasePath, { recursive: true })]);
  await copyFile(svgFixturePath, sourcePath);

  return {
    testRootPath,
    workspacePath,
    scratchBasePath: await realpath(scratchBasePath),
    sourcePath,
    outputPath,
  };
}

async function assertReadablePdf(filePath: string): Promise<void> {
  const bytes = await readFile(filePath);
  assert.ok(bytes.length > 0);
  const document = await PDFDocument.load(bytes);
  assert.ok(document.getPageCount() > 0);
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
