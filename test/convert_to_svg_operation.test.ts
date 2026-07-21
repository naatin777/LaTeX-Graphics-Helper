// Test target:
// - editable Draw.io画像をSVGへ変換するとき、Draw.io CLIへSVG出力を要求すること
// - 変換結果を.latex-graphics-helper配下で作成してから指定出力先へ反映すること
// - Draw.io CLI / pdftocairo の失敗をユーザー向けエラーに包むこと
//
// Not tested:
// - Draw.io CLI実体での変換
// - PDF → SVGの実変換経路
// - Safe Modeダイアログの画面表示

import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { convertToSvgFiles } from '../src/operations/convert_to_svg.js';

suite('SVGに変換する処理', () => {
  test('編集可能なDraw.io画像はDraw.io CLIでSVGへ変換する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-convert-to-svg-operation-'));

    try {
      const sourcePath = path.join(workspacePath, 'source.drawio.png');
      const outputPath = path.join(workspacePath, 'source', '1.svg');
      const drawioCalls: string[][] = [];
      await writeFile(sourcePath, 'editable drawio image placeholder');

      await convertToSvgFiles({
        jobs: [
          {
            sourcePath,
            outputPath,
            workspacePath,
            page: 1,
          },
        ],
        pdftocairoPath: 'pdftocairo',
        ghostscriptPath: 'gs',
        mermaid: {
          browserChannel: 'chrome',
          theme: 'default',
          backgroundColor: 'white',
        },
        drawio: {
          drawioPath: 'drawio',
          runDrawio: async (_executable, args) => {
            drawioCalls.push(args);
            const outputIndex = args.indexOf('-o') + 1;
            assert.ok(outputIndex > 0);
            await writeFile(args[outputIndex]!, '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
          },
        },
        runId: 'test-run',
      });

      assert.strictEqual(drawioCalls.length, 1);
      const args = drawioCalls[0]!;
      assert.deepStrictEqual(args.slice(0, 5), [
        '-x',
        '-f',
        'svg',
        '-o',
        path.join(workspacePath, '.latex-graphics-helper', 'convert-to-svg', 'test-run', '1', 'result.svg'),
      ]);
      assert.strictEqual(args.at(-1), sourcePath);
      assert.match(await readFile(outputPath, 'utf8'), /<svg[\s>]/);
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('Draw.io CLIの失敗をstderrつきのエラーに包む', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-convert-to-svg-operation-'));

    try {
      const sourcePath = path.join(workspacePath, 'source.drawio.png');
      const outputPath = path.join(workspacePath, 'source', '1.svg');
      await writeFile(sourcePath, 'editable drawio image placeholder');

      await assert.rejects(
        convertToSvgFiles({
          jobs: [
            {
              sourcePath,
              outputPath,
              workspacePath,
              page: 1,
            },
          ],
          pdftocairoPath: 'pdftocairo',
          ghostscriptPath: 'gs',
          mermaid: {
            browserChannel: 'chrome',
            theme: 'default',
            backgroundColor: 'white',
          },
          drawio: {
            drawioPath: 'drawio',
            runDrawio: async () => {
              throw errorWithStderr('spawn drawio ENOENT', 'drawio missing');
            },
          },
          runId: 'test-run',
        }),
        /Draw\.io CLI failed: spawn drawio ENOENT\ndrawio missing/,
      );
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('pdftocairoの失敗をstderrつきのエラーに包む', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-convert-to-svg-operation-'));

    try {
      const sourcePath = path.join(workspacePath, 'source.pdf');
      const outputPath = path.join(workspacePath, 'source-1.svg');
      await writeFile(sourcePath, '%PDF-1.7\n');

      await assert.rejects(
        convertToSvgFiles({
          jobs: [
            {
              sourcePath,
              outputPath,
              workspacePath,
              page: 1,
            },
          ],
          pdftocairoPath: 'pdftocairo',
          ghostscriptPath: 'gs',
          mermaid: {
            browserChannel: 'chrome',
            theme: 'default',
            backgroundColor: 'white',
          },
          drawio: {
            drawioPath: 'drawio',
          },
          runPdfToSvg: async () => {
            throw errorWithStderr('Command failed: pdftocairo', 'syntax error');
          },
          runId: 'test-run',
        }),
        /pdftocairo failed: Command failed: pdftocairo\nsyntax error/,
      );
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });
});

function errorWithStderr(message: string, stderr: string): Error & { stderr: string } {
  return Object.assign(new Error(message), { stderr });
}
