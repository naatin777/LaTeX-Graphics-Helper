// Test target:
// - cropPdfFilesのPDF変換結果、workspace境界検証、キャンセル時の停止動作
//
// Mocked:
// - Ghostscriptのbbox出力
//
// Not tested:
// - Ghostscript本体の描画精度
// - VS Codeのcommand UI
// - withProgressの表示

import assert from 'node:assert/strict';
import { constants } from 'node:fs';
import { access, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { PDFDocument, rgb } from 'pdf-lib';

import { cropPdfFiles, parseBoundingBoxes, type RunGhostscript } from '../../src/operations/pdf/crop_pdf_auto.js';

suite('PDF自動crop処理', () => {
  test('bbox取得にGhostscriptを1回だけ使い、全ページをpdf-libでcropする', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-crop-test-'));
    const sourcePath = path.join(workspacePath, 'source.pdf');
    const outputPath = path.join(workspacePath, 'output', 'source-crop.pdf');
    await writeFixturePdf(sourcePath);

    const calls: string[][] = [];
    const runGhostscript: RunGhostscript = async (_executable, args) => {
      calls.push(args);

      return {
        stdout: '',
        stderr: [
          '%%HiResBoundingBox: 10.000000 20.000000 110.000000 120.000000',
          '%%HiResBoundingBox: 40.000000 50.000000 240.000000 200.000000',
        ].join('\n'),
      };
    };

    await cropPdfFiles({
      jobs: [{ sourcePath, workspacePath, outputPath }],
      margin: 5,
      ghostscriptPath: 'gs',
      runId: 'run',
      runGhostscript,
      platform: 'linux',
    });

    assert.strictEqual(calls.length, 1);
    const copiedSourcePath = path.join(
      workspacePath,
      '.latex-graphics-helper',
      'crop-pdf',
      'run',
      '1-source',
      'source.pdf',
    );
    assert.deepStrictEqual(calls[0], ['-dSAFER', '-dBATCH', '-dNOPAUSE', '-sDEVICE=bbox', copiedSourcePath]);
    assert.ok(!calls[0]?.includes('-c'));
    assert.ok(!calls[0]?.some((argument) => argument.startsWith('--permit-file-read=')));
    assert.ok(!calls[0]?.includes('-sDEVICE=pdfwrite'));

    const outputDocument = await PDFDocument.load(await readFile(outputPath));
    assert.strictEqual(outputDocument.getPageCount(), 2);
    assert.deepStrictEqual(outputDocument.getPage(0).getMediaBox(), {
      x: 5,
      y: 15,
      width: 110,
      height: 110,
    });
    assert.deepStrictEqual(outputDocument.getPage(0).getCropBox(), {
      x: 5,
      y: 15,
      width: 110,
      height: 110,
    });
    assert.deepStrictEqual(outputDocument.getPage(1).getMediaBox(), {
      x: 35,
      y: 45,
      width: 210,
      height: 160,
    });

    const workDirectory = path.join(workspacePath, '.latex-graphics-helper', 'crop-pdf', 'run', '1-source');
    await access(path.join(workDirectory, 'source.pdf'));
    await access(path.join(workDirectory, 'result.pdf'));
    await assert.rejects(access(path.join(workDirectory, 'pages'), constants.F_OK));
  });

  test('空白ページでは元のMediaBoxを維持する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-crop-test-'));
    const sourcePath = path.join(workspacePath, 'blank.pdf');
    const outputPath = path.join(workspacePath, 'blank-crop.pdf');
    const document = await PDFDocument.create();
    document.addPage([320, 180]);
    await writeFile(sourcePath, await document.save());

    await cropPdfFiles({
      jobs: [{ sourcePath, workspacePath, outputPath }],
      margin: 20,
      ghostscriptPath: 'gs',
      runGhostscript: async () => ({
        stdout: '',
        stderr: '%%HiResBoundingBox: 0.000000 0.000000 0.000000 0.000000\n',
      }),
    });

    const outputDocument = await PDFDocument.load(await readFile(outputPath));
    assert.deepStrictEqual(outputDocument.getPage(0).getMediaBox(), {
      x: 0,
      y: 0,
      width: 320,
      height: 180,
    });
  });

  test('p-limitでPDF変換の同時実行数を制限する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-crop-test-'));
    const jobs = await Promise.all(
      ['first', 'second', 'third', 'fourth'].map(async (name) => {
        const sourcePath = path.join(workspacePath, `${name}.pdf`);
        await writeSinglePagePdf(sourcePath);

        return {
          sourcePath,
          workspacePath,
          outputPath: path.join(workspacePath, 'output', `${name}.pdf`),
        };
      }),
    );

    let active = 0;
    let maximumActive = 0;
    const runGhostscript: RunGhostscript = async () => {
      active++;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 20));
      active--;

      return {
        stdout: '',
        stderr: '%%HiResBoundingBox: 10 10 90 90\n',
      };
    };

    await cropPdfFiles({
      jobs,
      margin: 0,
      ghostscriptPath: 'gs',
      runGhostscript,
    });

    assert.strictEqual(maximumActive, 2);
  });

  test('既存の出力を上書きしない', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-crop-test-'));
    const sourcePath = path.join(workspacePath, 'source.pdf');
    const outputPath = path.join(workspacePath, 'source-crop.pdf');
    await writeSinglePagePdf(sourcePath);
    await writeFile(outputPath, 'existing');

    await assert.rejects(
      cropPdfFiles({
        jobs: [{ sourcePath, workspacePath, outputPath }],
        margin: 0,
        ghostscriptPath: 'gs',
        runGhostscript: async () => {
          throw new Error('Ghostscript should not run.');
        },
      }),
      /Output file already exists/,
    );

    assert.strictEqual(await readFile(outputPath, 'utf8'), 'existing');
  });

  test('Ghostscript実行前に宣言workspace外の入力ファイルを拒否する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-workspace-'));
    const outsideDirectory = await mkdtemp(path.join(os.tmpdir(), 'lgh-outside-'));
    const sourcePath = path.join(outsideDirectory, 'source.pdf');
    const outputPath = path.join(workspacePath, 'source-crop.pdf');
    await writeSinglePagePdf(sourcePath);

    let ghostscriptCalled = false;

    await assert.rejects(
      cropPdfFiles({
        jobs: [{ sourcePath, workspacePath, outputPath }],
        margin: 0,
        ghostscriptPath: 'gs',
        runGhostscript: async () => {
          ghostscriptCalled = true;
          return { stdout: '', stderr: '%%HiResBoundingBox: 10 10 90 90\n' };
        },
      }),
      /outside the workspace/,
    );

    assert.strictEqual(ghostscriptCalled, false);
  });

  test('Ghostscript実行前にworkspace外の出力パスを拒否する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-workspace-'));
    const outsideDirectory = await mkdtemp(path.join(os.tmpdir(), 'lgh-outside-'));
    const sourcePath = path.join(workspacePath, 'source.pdf');
    const outputPath = path.join(outsideDirectory, 'source-crop.pdf');
    await writeSinglePagePdf(sourcePath);

    let ghostscriptCalled = false;

    await assert.rejects(
      cropPdfFiles({
        jobs: [{ sourcePath, workspacePath, outputPath }],
        margin: 0,
        ghostscriptPath: '/outside/workspace/gs',
        runGhostscript: async () => {
          ghostscriptCalled = true;
          return { stdout: '', stderr: '%%HiResBoundingBox: 10 10 90 90\n' };
        },
      }),
      /outside the workspace/,
    );

    assert.strictEqual(ghostscriptCalled, false);
  });

  test('既にキャンセル済みの場合はGhostscriptを開始しない', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-crop-test-'));
    const sourcePath = path.join(workspacePath, 'source.pdf');
    const outputPath = path.join(workspacePath, 'source-crop.pdf');
    const abortController = new AbortController();
    await writeSinglePagePdf(sourcePath);
    abortController.abort();

    let ghostscriptCalled = false;

    await assert.rejects(
      cropPdfFiles({
        jobs: [{ sourcePath, workspacePath, outputPath }],
        margin: 0,
        ghostscriptPath: 'gs',
        signal: abortController.signal,
        runGhostscript: async () => {
          ghostscriptCalled = true;
          return { stdout: '', stderr: '%%HiResBoundingBox: 10 10 90 90\n' };
        },
      }),
      { name: 'AbortError' },
    );

    assert.strictEqual(ghostscriptCalled, false);
    await assert.rejects(access(outputPath));
  });

  test('実行中のGhostscript処理へキャンセルを伝える', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-crop-test-'));
    const sourcePath = path.join(workspacePath, 'source.pdf');
    const outputPath = path.join(workspacePath, 'source-crop.pdf');
    const abortController = new AbortController();
    await writeSinglePagePdf(sourcePath);

    let receivedSignal: AbortSignal | undefined;
    const runGhostscript: RunGhostscript = async (_executable, _args, signal) => {
      receivedSignal = signal;
      abortController.abort();
      signal?.throwIfAborted();

      throw new Error('Ghostscript cancellation was not propagated.');
    };

    await assert.rejects(
      cropPdfFiles({
        jobs: [{ sourcePath, workspacePath, outputPath }],
        margin: 0,
        ghostscriptPath: 'gs',
        signal: abortController.signal,
        runGhostscript,
      }),
      { name: 'AbortError' },
    );

    assert.strictEqual(receivedSignal?.aborted, true);
    await assert.rejects(access(outputPath));
  });

  test('キャンセル後はqueue内の変換を開始しない', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-crop-test-'));
    const abortController = new AbortController();
    const jobs = await Promise.all(
      ['first', 'second', 'third', 'fourth'].map(async (name) => {
        const sourcePath = path.join(workspacePath, `${name}.pdf`);
        await writeSinglePagePdf(sourcePath);

        return {
          sourcePath,
          workspacePath,
          outputPath: path.join(workspacePath, 'output', `${name}.pdf`),
        };
      }),
    );

    let startedConversions = 0;
    const runGhostscript: RunGhostscript = async (_executable, _args, signal) => {
      startedConversions++;

      if (startedConversions === 2) {
        abortController.abort();
      }

      signal?.throwIfAborted();
      return { stdout: '', stderr: '%%HiResBoundingBox: 10 10 90 90\n' };
    };

    await assert.rejects(
      cropPdfFiles({
        jobs,
        margin: 0,
        ghostscriptPath: 'gs',
        signal: abortController.signal,
        runGhostscript,
      }),
      { name: 'AbortError' },
    );
    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.strictEqual(startedConversions, 2);

    for (const job of jobs) {
      await assert.rejects(access(job.outputPath));
    }
  });

  test('Ghostscript実行ファイルが見つからない場合はエラーにする', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-crop-test-'));
    const sourcePath = path.join(workspacePath, 'source.pdf');
    const outputPath = path.join(workspacePath, 'source-crop.pdf');
    await writeSinglePagePdf(sourcePath);

    const runGhostscript: RunGhostscript = async () => {
      const error = new Error('spawn gs ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      throw error instanceof Error ? error : new Error(String(error));
    };

    await assert.rejects(
      cropPdfFiles({
        jobs: [{ sourcePath, workspacePath, outputPath }],
        margin: 0,
        ghostscriptPath: 'gs',
        runGhostscript,
      }),
      /ENOENT/,
    );

    await assert.rejects(access(outputPath));
  });

  test('Ghostscript実行が失敗した場合はエラーにする', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-crop-test-'));
    const sourcePath = path.join(workspacePath, 'source.pdf');
    const outputPath = path.join(workspacePath, 'source-crop.pdf');
    await writeSinglePagePdf(sourcePath);

    const runGhostscript: RunGhostscript = async () => {
      throw new Error('Ghostscript failed with exit code 1');
    };

    await assert.rejects(
      cropPdfFiles({
        jobs: [{ sourcePath, workspacePath, outputPath }],
        margin: 0,
        ghostscriptPath: 'gs',
        runGhostscript,
      }),
      /Ghostscript failed/,
    );

    await assert.rejects(access(outputPath));
  });

  test('Ghostscript実行失敗をOutput channelへ記録する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-crop-test-'));
    const sourcePath = path.join(workspacePath, 'source.pdf');
    const outputPath = path.join(workspacePath, 'source-crop.pdf');
    await writeSinglePagePdf(sourcePath);

    const logMessages: string[] = [];
    const mockOutputChannel = {
      appendLine: (message: string) => {
        logMessages.push(message);
      },
    };

    const runGhostscript: RunGhostscript = async () => {
      throw new Error('Ghostscript failed with exit code 1');
    };

    await assert.rejects(
      cropPdfFiles({
        jobs: [{ sourcePath, workspacePath, outputPath }],
        margin: 0,
        ghostscriptPath: 'gs',
        runGhostscript,
        outputChannel: mockOutputChannel,
      }),
      /Ghostscript failed/,
    );

    assert.ok(logMessages.length > 0, 'Expected at least one log message');
    assert.ok(
      logMessages.some((msg) => msg.includes('Ghostscript')),
      'Expected log to mention Ghostscript',
    );
  });
});

suite('BoundingBoxのparse処理', () => {
  test('GhostscriptのHiResBoundingBox出力をparseする', () => {
    assert.deepStrictEqual(parseBoundingBoxes('%%HiResBoundingBox: -1.5 2 30.25 40\n'), [
      { left: -1.5, bottom: 2, right: 30.25, top: 40 },
    ]);
  });
});

async function writeFixturePdf(filePath: string): Promise<void> {
  const document = await PDFDocument.create();
  const firstPage = document.addPage([300, 200]);
  firstPage.drawRectangle({ x: 10, y: 20, width: 100, height: 100, color: rgb(1, 0, 0) });
  const secondPage = document.addPage([400, 300]);
  secondPage.drawRectangle({ x: 40, y: 50, width: 200, height: 150, color: rgb(0, 0, 1) });
  await writeFile(filePath, await document.save());
}

async function writeSinglePagePdf(filePath: string): Promise<void> {
  const document = await PDFDocument.create();
  const page = document.addPage([100, 100]);
  page.drawRectangle({ x: 10, y: 10, width: 80, height: 80, color: rgb(1, 0, 0) });
  await writeFile(filePath, await document.save());
}
