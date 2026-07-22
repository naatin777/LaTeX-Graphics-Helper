// Test target:
// - 複数PNGをすべてステージングしてから1回で出力先へ反映すること
// - Safe Modeの両方残す・上書きしない・上書きするがバッチ全体へ適用されること
// - 変換失敗とキャンセル時に指定出力先へ何も反映しないこと
// - 上書き後の直前変換取消で元ファイルを復元すること
// - editable Draw.io画像変換にもSafe ModeとUndoが効くこと
//
// Mocked:
// - Safe Modeの競合判断
//
// Not tested:
// - VS Codeのダイアログとstatus barの描画
// - VS CodeのwithProgress表示
// - JPEG/WebP/AVIF/SVG/Mermaid

import assert from 'node:assert/strict';
import { access, copyFile, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PDFDocument } from 'pdf-lib';

import { convertToPdfFiles, type ConvertToPdfJob, type RunDrawio } from '../src/operations/convert_to_pdf.js';
import { createConversionUndoRecord, undoConversionOutputs } from '../src/operations/undo_last_conversion.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(testDirectory, '..', '..', 'test', 'fixtures', 'test.png');
const editableDrawioImageExtensions = ['.drawio.png', '.dio.png', '.drawio.svg', '.dio.svg'] as const;

suite('PNG変換のSafe Mode', () => {
  test('すべての変換を作業領域に作成してから出力へ反映する', async () => {
    const { workspacePath, jobs } = await createJobs(['first', 'second']);

    const outputs = await convertToPdfFiles({
      jobs,
      runId: 'batch-success',
      resolveOutputConflicts: async () => 'overwrite',
    });

    assert.strictEqual(outputs.length, 2);

    for (const job of jobs) {
      const pdf = await PDFDocument.load(await readFile(job.outputPath));
      assert.strictEqual(pdf.getPageCount(), 1);
    }

    const stagedRoot = path.join(workspacePath, '.latex-graphics-helper', 'convert-png-to-pdf', 'batch-success');
    assert.deepStrictEqual(new Set(await readdir(stagedRoot)), new Set(['1', '2']));
    await assert.doesNotReject(access(path.join(stagedRoot, '1', 'result.pdf')));
    await assert.doesNotReject(access(path.join(stagedRoot, '2', 'result.pdf')));
  });

  test('バッチ全体で1回だけ競合判断を行い、両方残す', async () => {
    const { workspacePath, jobs } = await createJobs(['first', 'second']);
    await writeFile(jobs[0]!.outputPath, 'old-first');
    await writeFile(jobs[1]!.outputPath, 'old-second');
    await writeFile(path.join(workspacePath, 'first-1.pdf'), 'reserved');
    const decisions: string[][] = [];

    const outputs = await convertToPdfFiles({
      jobs,
      resolveOutputConflicts: async (conflicts) => {
        decisions.push(conflicts);
        return 'keep-both';
      },
    });

    assert.strictEqual(decisions.length, 1);
    assert.deepStrictEqual(new Set(decisions[0]), new Set(jobs.map((job) => job.outputPath)));
    assert.deepStrictEqual(
      new Set(outputs.map((output) => output.outputPath)),
      new Set([path.join(workspacePath, 'first-2.pdf'), path.join(workspacePath, 'second-1.pdf')]),
    );
    assert.strictEqual(await readFile(jobs[0]!.outputPath, 'utf8'), 'old-first');
    assert.strictEqual(await readFile(jobs[1]!.outputPath, 'utf8'), 'old-second');
  });

  test('上書きしない判断の場合はどの出力も反映しない', async () => {
    const { jobs } = await createJobs(['first', 'second']);
    await writeFile(jobs[0]!.outputPath, 'old-first');

    await assert.rejects(
      convertToPdfFiles({
        jobs,
        resolveOutputConflicts: async () => 'cancel',
      }),
      /cancelled/,
    );

    assert.strictEqual(await readFile(jobs[0]!.outputPath, 'utf8'), 'old-first');
    await assert.rejects(access(jobs[1]!.outputPath));
  });

  test('後続のPNG変換が失敗した場合は先行ジョブの出力も反映しない', async () => {
    const { workspacePath, jobs } = await createJobs(['first', 'second']);
    const invalidSourcePath = path.join(workspacePath, 'invalid.png');
    await writeFile(invalidSourcePath, 'not a PNG');
    jobs[1] = {
      ...jobs[1]!,
      sourcePath: invalidSourcePath,
    };

    await assert.rejects(
      convertToPdfFiles({
        jobs,
        resolveOutputConflicts: async () => 'overwrite',
      }),
    );

    await Promise.all(jobs.map((job) => assert.rejects(access(job.outputPath))));
  });

  test('上書きファイルをバックアップし、undo操作で復元する', async () => {
    const { jobs } = await createJobs(['first', 'second']);
    await writeFile(jobs[0]!.outputPath, 'old-first');
    await writeFile(jobs[1]!.outputPath, 'old-second');

    const outputs = await convertToPdfFiles({
      jobs,
      resolveOutputConflicts: async () => 'overwrite',
    });
    const undoRecord = await createConversionUndoRecord(outputs);

    assert.ok(outputs.every((output) => output.previousFilePath));
    await undoConversionOutputs(undoRecord);

    assert.strictEqual(await readFile(jobs[0]!.outputPath, 'utf8'), 'old-first');
    assert.strictEqual(await readFile(jobs[1]!.outputPath, 'utf8'), 'old-second');
  });

  test('既にキャンセル済みの場合は出力へ反映しない', async () => {
    const { jobs } = await createJobs(['first', 'second']);
    const abortController = new AbortController();
    abortController.abort();

    await assert.rejects(
      convertToPdfFiles({
        jobs,
        signal: abortController.signal,
        resolveOutputConflicts: async () => 'overwrite',
      }),
      { name: 'AbortError' },
    );

    await Promise.all(jobs.map((job) => assert.rejects(access(job.outputPath))));
  });

  test('編集可能なDraw.io PNG/SVGを注入したDraw.io runnerで変換する', async () => {
    const { jobs } = await createEditableDrawioJobs([
      ['source.drawio.png', 'source.pdf'],
      ['diagram.dio.svg', 'diagram.pdf'],
    ]);
    const calls: string[][] = [];

    const outputs = await convertToPdfFiles({
      jobs,
      supportedExtensions: editableDrawioImageExtensions,
      drawio: {
        drawioPath: 'drawio',
        runDrawio: createPdfWritingDrawioRunner(calls),
      },
      resolveOutputConflicts: async () => 'overwrite',
    });

    assert.strictEqual(outputs.length, 2);
    assert.deepStrictEqual(new Set(calls.map((args) => args.at(-1))), new Set(jobs.map((job) => job.sourcePath)));

    for (const job of jobs) {
      const pdf = await PDFDocument.load(await readFile(job.outputPath));
      assert.strictEqual(pdf.getPageCount(), 1);
    }
  });

  test('編集可能なDraw.io画像の出力競合では両方残す', async () => {
    const { jobs, workspacePath } = await createEditableDrawioJobs([['source.drawio.png', 'source.pdf']]);
    const originalOutputPath = jobs[0]!.outputPath;
    const keptOutputPath = path.join(workspacePath, 'source-1.pdf');
    await writeFile(originalOutputPath, 'old output');

    const outputs = await convertToPdfFiles({
      jobs,
      supportedExtensions: editableDrawioImageExtensions,
      drawio: {
        drawioPath: 'drawio',
        runDrawio: createPdfWritingDrawioRunner(),
      },
      resolveOutputConflicts: async () => 'keep-both',
    });

    assert.deepStrictEqual(
      outputs.map((output) => output.outputPath),
      [keptOutputPath],
    );
    assert.strictEqual(await readFile(originalOutputPath, 'utf8'), 'old output');
    const pdf = await PDFDocument.load(await readFile(keptOutputPath));
    assert.strictEqual(pdf.getPageCount(), 1);
  });

  test('編集可能なDraw.io画像の上書き出力をバックアップしundoで復元する', async () => {
    const { jobs } = await createEditableDrawioJobs([['source.drawio.png', 'source.pdf']]);
    await writeFile(jobs[0]!.outputPath, 'old output');

    const outputs = await convertToPdfFiles({
      jobs,
      supportedExtensions: editableDrawioImageExtensions,
      drawio: {
        drawioPath: 'drawio',
        runDrawio: createPdfWritingDrawioRunner(),
      },
      resolveOutputConflicts: async () => 'overwrite',
    });

    const undoRecord = await createConversionUndoRecord(outputs);
    await undoConversionOutputs(undoRecord);

    assert.strictEqual(await readFile(jobs[0]!.outputPath, 'utf8'), 'old output');
  });
});

async function createJobs(names: string[]): Promise<{
  workspacePath: string;
  jobs: ConvertToPdfJob[];
}> {
  const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-png-safe-test-'));
  const jobs = await Promise.all(
    names.map(async (name) => {
      const sourcePath = path.join(workspacePath, `${name}.png`);
      await copyFile(fixturePath, sourcePath);

      return {
        sourcePath,
        outputPath: path.join(workspacePath, `${name}.pdf`),
        workspacePath,
      };
    }),
  );

  return { workspacePath, jobs };
}

async function createEditableDrawioJobs(entries: [sourceName: string, outputName: string][]): Promise<{
  workspacePath: string;
  jobs: ConvertToPdfJob[];
}> {
  const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-drawio-safe-test-'));
  const jobs = await Promise.all(
    entries.map(async ([sourceName, outputName]) => {
      const sourcePath = path.join(workspacePath, sourceName);
      await writeFile(sourcePath, 'editable drawio image');

      return {
        sourcePath,
        outputPath: path.join(workspacePath, outputName),
        workspacePath,
      };
    }),
  );

  return { workspacePath, jobs };
}

function createPdfWritingDrawioRunner(calls: string[][] = []): RunDrawio {
  return async (_executable, args) => {
    calls.push(args);
    const outputPath = args[args.indexOf('-o') + 1];
    assert.ok(outputPath);
    const document = await PDFDocument.create();
    document.addPage([120, 80]);
    await writeFile(outputPath, await document.save());
  };
}
