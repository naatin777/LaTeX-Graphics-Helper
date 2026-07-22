// Test target:
// - WindowsでcropPdfFilesがUnicodeの論理入力をASCII scratchへcopyしてGhostscriptへ渡すこと
// - 成功時だけscratchを削除し、失敗・cancel時は診断用に残すこと
// - scratchを使ってもユーザー向けの論理出力pathを維持すること
//
// Mocked:
// - Ghostscriptのprocess実行とbbox出力
// - Windows platformとscratch base候補
//
// Not tested:
// - Ghostscript本体のWindowsでのpath互換性（3 OSの実体probeで別に確認する）
// - scratch base候補のfallbackとsymlink検証
// - VS Codeのcommand UI

import assert from 'node:assert/strict';
import { constants } from 'node:fs';
import { access, copyFile, mkdir, mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PDFDocument } from 'pdf-lib';

import { cropPdfFiles, type RunGhostscript } from '../../src/operations/pdf/crop_pdf_auto.js';

const compiledTestDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(
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
  '　日本語 English 한국어 中文 العربية हिन्दी ไทย עברית Ελληνικά Русский 🌹 ＡＢＣ１２３①.pdf';

type CropPdfFilesWithScratchOptions = (
  options: Parameters<typeof cropPdfFiles>[0] & {
    platform: NodeJS.Platform;
    scratchBaseCandidates: readonly string[];
  },
) => ReturnType<typeof cropPdfFiles>;

// Implementation Phaseで追加するplatform・scratch候補の注入契約を、失敗テストでも型安全に呼ぶ。
const cropPdfFilesWithScratchOptions = cropPdfFiles as CropPdfFilesWithScratchOptions;

suite('Windows Ghostscript ASCII scratch', () => {
  test('Unicode論理入力を固定ASCII名でGhostscriptへ渡し、成功後にscratchを削除する', async () => {
    const paths = await prepareFixedFixtureWorkspace();
    let toolInputPath: string | undefined;
    let toolInputBytes: Buffer | undefined;

    try {
      const sourceBytes = await readFile(paths.sourcePath);
      const pageCount = (await PDFDocument.load(sourceBytes)).getPageCount();
      const runGhostscript: RunGhostscript = async (_executable, args) => {
        toolInputPath = requiredToolInputPath(args);
        toolInputBytes = await readFile(toolInputPath);

        return {
          stdout: '',
          stderr: boundingBoxesFor(pageCount),
        };
      };

      await cropPdfFilesWithScratchOptions({
        jobs: [
          {
            sourcePath: paths.sourcePath,
            workspacePath: paths.workspacePath,
            outputPath: paths.outputPath,
          },
        ],
        margin: 0,
        ghostscriptPath: 'gs',
        runId: 'unicode-path',
        runGhostscript,
        platform: 'win32',
        scratchBaseCandidates: [paths.scratchBasePath],
      });

      const requiredInputPath = assertAsciiScratchInput(toolInputPath, paths);
      assert.deepStrictEqual(toolInputBytes, sourceBytes);
      await assert.rejects(access(requiredInputPath, constants.F_OK));

      const outputDocument = await PDFDocument.load(await readFile(paths.outputPath));
      assert.strictEqual(outputDocument.getPageCount(), pageCount);
      assert.deepStrictEqual(await readFile(paths.sourcePath), sourceBytes);
    } finally {
      await rm(paths.testRootPath, { recursive: true, force: true });
    }
  });

  test('Ghostscript失敗時は論理出力を作らず、診断用scratchを残す', async () => {
    const paths = await prepareFixedFixtureWorkspace();
    let toolInputPath: string | undefined;

    try {
      const sourceBytes = await readFile(paths.sourcePath);
      const runGhostscript: RunGhostscript = async (_executable, args) => {
        toolInputPath = requiredToolInputPath(args);
        throw new Error('Ghostscript failed with exit code 1');
      };

      await assert.rejects(
        cropPdfFilesWithScratchOptions({
          jobs: [
            {
              sourcePath: paths.sourcePath,
              workspacePath: paths.workspacePath,
              outputPath: paths.outputPath,
            },
          ],
          margin: 0,
          ghostscriptPath: 'gs',
          runId: 'ghostscript-failure',
          runGhostscript,
          platform: 'win32',
          scratchBaseCandidates: [paths.scratchBasePath],
        }),
        /Ghostscript failed/,
      );

      const requiredInputPath = assertAsciiScratchInput(toolInputPath, paths);
      assert.deepStrictEqual(await readFile(requiredInputPath), sourceBytes);
      await assert.rejects(access(paths.outputPath, constants.F_OK));
    } finally {
      await rm(paths.testRootPath, { recursive: true, force: true });
    }
  });

  test('Ghostscriptキャンセル時は論理出力を作らず、診断用scratchを残す', async () => {
    const paths = await prepareFixedFixtureWorkspace();
    const abortController = new AbortController();
    let toolInputPath: string | undefined;

    try {
      const sourceBytes = await readFile(paths.sourcePath);
      const runGhostscript: RunGhostscript = async (_executable, args, signal) => {
        toolInputPath = requiredToolInputPath(args);
        abortController.abort();
        signal?.throwIfAborted();

        throw new Error('Ghostscript cancellation was not propagated.');
      };

      await assert.rejects(
        cropPdfFilesWithScratchOptions({
          jobs: [
            {
              sourcePath: paths.sourcePath,
              workspacePath: paths.workspacePath,
              outputPath: paths.outputPath,
            },
          ],
          margin: 0,
          ghostscriptPath: 'gs',
          runId: 'ghostscript-cancel',
          runGhostscript,
          runtime: { signal: abortController.signal },
          platform: 'win32',
          scratchBaseCandidates: [paths.scratchBasePath],
        }),
        { name: 'AbortError' },
      );

      const requiredInputPath = assertAsciiScratchInput(toolInputPath, paths);
      assert.deepStrictEqual(await readFile(requiredInputPath), sourceBytes);
      await assert.rejects(access(paths.outputPath, constants.F_OK));
    } finally {
      await rm(paths.testRootPath, { recursive: true, force: true });
    }
  });
});

interface FixedFixtureWorkspace {
  testRootPath: string;
  workspacePath: string;
  scratchBasePath: string;
  sourcePath: string;
  outputPath: string;
}

async function prepareFixedFixtureWorkspace(): Promise<FixedFixtureWorkspace> {
  const testRootPath = await mkdtemp(path.join(os.tmpdir(), 'lgh-gs-scratch-test-'));
  const workspacePath = path.join(testRootPath, 'workspace 日本語 हिन्दी 🌹');
  const scratchBasePath = path.join(testRootPath, 'scratch');
  const sourcePath = path.join(workspacePath, complexSourceFileName);
  const outputPath = path.join(workspacePath, '結果 한국어 🌹-crop.pdf');

  await Promise.all([mkdir(workspacePath, { recursive: true }), mkdir(scratchBasePath, { recursive: true })]);
  await copyFile(fixturePath, sourcePath);

  return {
    testRootPath,
    workspacePath,
    scratchBasePath: await realpath(scratchBasePath),
    sourcePath,
    outputPath,
  };
}

function requiredToolInputPath(args: string[]): string {
  const toolInputPath = args.at(-1);
  assert.ok(toolInputPath, 'Ghostscriptへ入力pathが渡されること');
  return toolInputPath;
}

function assertAsciiScratchInput(toolInputPath: string | undefined, paths: FixedFixtureWorkspace): string {
  assert.ok(toolInputPath, 'Ghostscriptが呼ばれること');
  assert.strictEqual(path.basename(toolInputPath), 'input.pdf');
  assert.match(toolInputPath, /^[\x20-\x7e]+$/u);
  assert.strictEqual(isPathInside(paths.scratchBasePath, toolInputPath), true);
  assert.strictEqual(isPathInside(paths.workspacePath, toolInputPath), false);
  return toolInputPath;
}

function isPathInside(parentPath: string, childPath: string): boolean {
  const relativePath = path.relative(parentPath, childPath);
  return (
    relativePath === '' ||
    (relativePath !== '..' && !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath))
  );
}

function boundingBoxesFor(pageCount: number): string {
  return Array.from({ length: pageCount }, () => '%%HiResBoundingBox: 10.000000 20.000000 110.000000 120.000000').join(
    '\n',
  );
}
