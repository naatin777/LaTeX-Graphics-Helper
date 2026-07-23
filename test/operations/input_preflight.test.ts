import { deepStrictEqual, ok, rejects, strictEqual } from 'node:assert/strict';
import { mkdir, mkdtemp, open, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setImmediate } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import { PDFDocument } from 'pdf-lib';

import sharp from 'sharp';
import {
  assertPreflightPassed,
  runPreflightBatch,
  type PreflightReport,
} from '../../src/operations/input/input_preflight.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(testDirectory, '..', '..', '..', 'test', 'fixtures', 'preflight');
const EPS_FIXTURES = path.join(testDirectory, '..', '..', '..', 'test', 'fixtures', 'eps');

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
}

function createDeferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function waitFor(condition: () => boolean, message: string): Promise<void> {
  for (let attempt = 0; attempt < 100 && !condition(); attempt += 1) {
    await setImmediate();
  }
  ok(condition(), message);
}

function validReport(sourcePath: string): PreflightReport {
  return { sourcePath, format: 'pdf', fileSize: 1, result: 'ok' };
}

function assertOk(report: PreflightReport): void {
  strictEqual(
    report.result,
    'ok',
    `Expected OK for ${path.basename(report.sourcePath)}, got ${report.result}: ${report.reason ?? ''}`,
  );
}

function assertError(report: PreflightReport, messageContains?: string): void {
  strictEqual(report.result, 'error', `Expected ERROR for ${path.basename(report.sourcePath)}, got ${report.result}`);
  if (messageContains !== undefined) {
    ok(
      report.reason?.includes(messageContains),
      `Expected reason to contain "${messageContains}", got: ${report.reason ?? '(none)'}`,
    );
  }
}

function assertWarning(report: PreflightReport): void {
  strictEqual(
    report.result,
    'warning',
    `Expected WARNING for ${path.basename(report.sourcePath)}, got ${report.result}`,
  );
}

suite('Preflight — 共通検査', () => {
  test('空ファイルをerrorとして検出する', async () => {
    const result = await runPreflightBatch([path.join(FIXTURES, 'empty.pdf')]);
    strictEqual(result.canProceed, false);
    strictEqual(result.errors.length, 1);
    assertError(result.errors[0]!, 'Empty file');
  });

  test('読み込めない入力をFile not readable errorとして検出する', async () => {
    const result = await runPreflightBatch([path.join(FIXTURES, 'missing.pdf')]);
    strictEqual(result.canProceed, false);
    strictEqual(result.errors.length, 1);
    assertError(result.errors[0]!, 'File not readable');
  });

  test('未対応の拡張子をerrorとして検出する', async () => {
    const result = await runPreflightBatch([path.join(FIXTURES, 'valid.pdf') + '.unknown']);
    strictEqual(result.canProceed, false);
    assertError(result.errors[0]!, 'Unsupported format');
  });

  test('対応拡張子を持つdirectoryを入力fileとして扱わない', async () => {
    const testRoot = await mkdtemp(path.join(os.tmpdir(), 'lgh-preflight-directory-'));
    const disguisedDirectory = path.join(testRoot, 'diagram.drawio.png');

    try {
      await mkdir(disguisedDirectory);
      const result = await runPreflightBatch([disguisedDirectory]);
      strictEqual(result.canProceed, false);
      assertError(result.errors[0]!, 'not a regular file');
    } finally {
      await rm(testRoot, { recursive: true, force: true });
    }
  });

  test('固定file-size上限を理由に入力を拒否しない', async () => {
    const testRoot = await mkdtemp(path.join(os.tmpdir(), 'lgh-preflight-large-file-'));
    const sourcePath = path.join(testRoot, 'large.pdf');
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([100, 100]);
    const pdfBytes = await pdfDoc.save();
    const handle = await open(sourcePath, 'w+');

    try {
      await handle.writeFile(pdfBytes);
      await handle.truncate(501 * 1024 * 1024);
      const result = await runPreflightBatch([sourcePath]);
      strictEqual(result.canProceed, true);
      assertOk(result.reports[0]!);
    } finally {
      await handle.close();
      await rm(testRoot, { recursive: true, force: true });
    }
  });

  test('複数ファイルを同時に検査する', async () => {
    const result = await runPreflightBatch([
      path.join(FIXTURES, 'valid.pdf'),
      path.join(FIXTURES, 'valid.png'),
      path.join(FIXTURES, 'empty.pdf'),
    ]);
    strictEqual(result.canProceed, false);
    strictEqual(result.errors.length, 1);
    strictEqual(result.errors[0]!.result, 'error');
    const oks = result.reports.filter((report) => report.result === 'ok');
    strictEqual(oks.length, 2);
  });

  test('全件okの場合はcanProceedがtrue', async () => {
    const result = await runPreflightBatch([path.join(FIXTURES, 'valid.pdf'), path.join(FIXTURES, 'valid.png')]);
    strictEqual(result.canProceed, true);
    strictEqual(result.errors.length, 0);
  });

  test('失敗理由に入力pathを含める', async () => {
    const missingPath = path.join(FIXTURES, 'missing.pdf');
    await rejects(assertPreflightPassed([{ sourcePath: missingPath }]), (error: unknown) => {
      return (
        error instanceof Error && error.message.includes(missingPath) && error.message.includes('File not readable')
      );
    });
  });
});

suite('Preflight — batch lifecycle', () => {
  test('同時実行数を2件に制限し、完了順に関係なくレポート順を維持する', async () => {
    const sourcePaths = ['first.pdf', 'second.pdf', 'third.pdf', 'fourth.pdf'];
    const gates = new Map(sourcePaths.map((sourcePath) => [sourcePath, createDeferred()]));
    const started: string[] = [];
    let active = 0;
    let maxActive = 0;

    const resultPromise = runPreflightBatch(sourcePaths, {
      validate: async (sourcePath) => {
        started.push(sourcePath);
        active += 1;
        maxActive = Math.max(maxActive, active);
        try {
          await gates.get(sourcePath)!.promise;
          return validReport(sourcePath);
        } finally {
          active -= 1;
        }
      },
    });

    await waitFor(() => started.length === 2, '最初の2件だけが開始されること');
    strictEqual(active, 2);
    strictEqual(maxActive, 2);

    gates.get('second.pdf')!.resolve();
    gates.get('first.pdf')!.resolve();
    await waitFor(() => started.length === 4, '空いたslotで後続の2件が開始されること');

    gates.get('fourth.pdf')!.resolve();
    gates.get('third.pdf')!.resolve();
    const result = await resultPromise;

    strictEqual(maxActive, 2);
    deepStrictEqual(
      result.reports.map((report) => report.sourcePath),
      sourcePaths,
    );
  });

  test('開始前にキャンセル済みならvalidatorを開始せずAbortErrorを伝播する', async () => {
    const controller = new AbortController();
    controller.abort();
    const reason = controller.signal.reason;
    let validationCount = 0;

    ok(reason instanceof Error);
    strictEqual(reason.name, 'AbortError');
    await rejects(
      runPreflightBatch(['first.pdf', 'second.pdf'], {
        signal: controller.signal,
        validate: async (sourcePath) => {
          validationCount += 1;
          return validReport(sourcePath);
        },
      }),
      (error: unknown) => error === reason,
    );
    strictEqual(validationCount, 0);
  });

  test('キャンセル後はキュー済みvalidatorを開始しない', async () => {
    const sourcePaths = ['first.pdf', 'second.pdf', 'third.pdf', 'fourth.pdf'];
    const controller = new AbortController();
    const gates = new Map([
      ['first.pdf', createDeferred()],
      ['second.pdf', createDeferred()],
    ]);
    const started: string[] = [];

    const resultPromise = runPreflightBatch(sourcePaths, {
      signal: controller.signal,
      validate: async (sourcePath) => {
        started.push(sourcePath);
        const gate = gates.get(sourcePath);
        if (gate !== undefined) {
          await gate.promise;
        }
        return validReport(sourcePath);
      },
    });

    await waitFor(() => started.length === 2, 'キャンセル前に実行中の2件が開始されること');
    controller.abort();
    gates.get('first.pdf')!.resolve();
    gates.get('second.pdf')!.resolve();

    await rejects(resultPromise, (error: unknown) => error === controller.signal.reason);
    deepStrictEqual(started, ['first.pdf', 'second.pdf']);
  });
});

suite('Preflight — PDF', () => {
  test('有効なPDFをokとして検出する', async () => {
    const result = await runPreflightBatch([path.join(FIXTURES, 'valid.pdf')]);
    strictEqual(result.canProceed, true);
    assertOk(result.reports[0]!);
  });

  test('%PDF-headerがないファイルをerrorとして検出する', async () => {
    const result = await runPreflightBatch([path.join(FIXTURES, 'invalid-header.pdf')]);
    strictEqual(result.canProceed, false);
    assertError(result.errors[0]!, 'Not a valid PDF');
  });
});

suite('Preflight — Raster', () => {
  test('有効なPNGをokとして検出する', async () => {
    const result = await runPreflightBatch([path.join(FIXTURES, 'valid.png')]);
    strictEqual(result.canProceed, true);
    assertOk(result.reports[0]!);
  });

  test('設定pixel上限を超える画像をerrorとして検出する', async () => {
    const testRoot = await mkdtemp(path.join(os.tmpdir(), 'lgh-preflight-pixel-limit-'));
    const sourcePath = path.join(testRoot, 'ten-by-ten.png');

    try {
      await sharp({
        create: {
          width: 10,
          height: 10,
          channels: 4,
          background: { r: 32, g: 64, b: 96, alpha: 1 },
        },
      })
        .png()
        .toFile(sourcePath);

      const result = await runPreflightBatch([sourcePath], { maxInputPixels: 99 });
      assertError(result.errors[0]!, 'Configured limit: 99 pixels');
      ok(result.errors[0]!.reason?.includes('latex-graphics-helper.raster.maxInputPixels'));
    } finally {
      await rm(testRoot, { recursive: true, force: true });
    }
  });

  test('設定pixel上限以内の画像をokとして検出する', async () => {
    const testRoot = await mkdtemp(path.join(os.tmpdir(), 'lgh-preflight-pixel-limit-'));
    const sourcePath = path.join(testRoot, 'ten-by-ten.png');

    try {
      await sharp({
        create: {
          width: 10,
          height: 10,
          channels: 4,
          background: { r: 32, g: 64, b: 96, alpha: 1 },
        },
      })
        .png()
        .toFile(sourcePath);

      const result = await runPreflightBatch([sourcePath], { maxInputPixels: 100 });
      assertOk(result.reports[0]!);
      strictEqual(result.reports[0]!.details?.width, 10);
      strictEqual(result.reports[0]!.details?.height, 10);
    } finally {
      await rm(testRoot, { recursive: true, force: true });
    }
  });

  test('破損したPNGをerrorとして検出する', async () => {
    const result = await runPreflightBatch([path.join(FIXTURES, 'corrupted.png')]);
    strictEqual(result.canProceed, false);
    assertError(result.errors[0]!, 'Image validation failed');
  });

  test('固定pixel-count上限を理由にwarningにしない', async () => {
    const testRoot = await mkdtemp(path.join(os.tmpdir(), 'lgh-preflight-large-image-'));
    const sourcePath = path.join(testRoot, 'large.png');

    try {
      await writeFile(sourcePath, '<svg xmlns="http://www.w3.org/2000/svg" width="20000" height="10000"></svg>');
      const result = await runPreflightBatch([sourcePath]);
      strictEqual(result.canProceed, true);
      strictEqual(result.warnings.length, 0);
      assertOk(result.reports[0]!);
    } finally {
      await rm(testRoot, { recursive: true, force: true });
    }
  });
});

suite('Preflight — SVG', () => {
  test('有効なSVGをokとして検出する', async () => {
    const result = await runPreflightBatch([path.join(FIXTURES, 'valid.svg')]);
    strictEqual(result.canProceed, true);
    assertOk(result.reports[0]!);
  });

  test('rootがsvgでないファイルをwarningとして検出する', async () => {
    const result = await runPreflightBatch([path.join(FIXTURES, 'no-root.svg')]);
    strictEqual(result.canProceed, true);
    assertWarning(result.warnings[0]!);
  });

  test('viewBoxもwidth/heightもないSVGをwarningとして検出する', async () => {
    const result = await runPreflightBatch([path.join(FIXTURES, 'no-dimensions.svg')]);
    strictEqual(result.canProceed, true);
    assertWarning(result.warnings[0]!);
  });
});

suite('Preflight — Mermaid', () => {
  test('有効なMermaidファイルをokとして検出する', async () => {
    const result = await runPreflightBatch([path.join(FIXTURES, 'valid.mmd')]);
    strictEqual(result.canProceed, true);
    assertOk(result.reports[0]!);
  });

  test('空のMermaidファイルをerrorとして検出する', async () => {
    const result = await runPreflightBatch([path.join(FIXTURES, 'empty.mmd')]);
    strictEqual(result.canProceed, false);
    assertError(result.errors[0]!, 'Empty file');
  });
});

suite('Preflight — Draw.io', () => {
  test('有効なDraw.io XMLをokとして検出する', async () => {
    const result = await runPreflightBatch([path.join(FIXTURES, 'valid.drawio')]);
    strictEqual(result.canProceed, true);
    assertOk(result.reports[0]!);
  });

  test('XML構造でないDraw.ioファイルをwarningとして検出する', async () => {
    const result = await runPreflightBatch([path.join(FIXTURES, 'non-xml.drawio')]);
    strictEqual(result.canProceed, true);
    assertWarning(result.warnings[0]!);
  });
});

suite('Preflight — EPS', () => {
  test('有効なEPSをokとして検出する', async () => {
    const result = await runPreflightBatch([path.join(EPS_FIXTURES, 'minimal.eps')]);
    strictEqual(result.canProceed, true);
    assertOk(result.reports[0]!);
  });

  test('headerがないEPSをerrorとして検出する', async () => {
    const result = await runPreflightBatch([path.join(EPS_FIXTURES, 'no-header.eps')]);
    strictEqual(result.canProceed, false);
    assertError(result.errors[0]!, 'PostScript header');
  });

  test('BoundingBoxが不正なEPSをerrorとして検出する', async () => {
    const result = await runPreflightBatch([path.join(EPS_FIXTURES, 'invalid-bbox.eps')]);
    strictEqual(result.canProceed, false);
    assertError(result.errors[0]!, 'Invalid BoundingBox');
  });

  test('BoundingBoxがatendのEPSをwarningとして検出する', async () => {
    const result = await runPreflightBatch([path.join(EPS_FIXTURES, 'atend.eps')]);
    strictEqual(result.canProceed, true);
    assertWarning(result.warnings[0]!);
  });
});

suite('Preflight — PDF詳細検査', () => {
  test('複数ページPDFのpageCountを詳細に含む', async () => {
    const testRoot = await mkdtemp(path.join(os.tmpdir(), 'lgh-preflight-multipage-pdf-'));
    const sourcePath = path.join(testRoot, 'multi.pdf');

    try {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([100, 100]);
      pdfDoc.addPage([200, 200]);
      pdfDoc.addPage([300, 300]);
      const pdfBytes = await pdfDoc.save();
      await writeFile(sourcePath, pdfBytes);

      const result = await runPreflightBatch([sourcePath]);
      strictEqual(result.canProceed, true);
      assertOk(result.reports[0]!);
      ok(result.reports[0]!.details?.pageCount === 3, 'pageCount should be 3');
    } finally {
      await rm(testRoot, { recursive: true, force: true });
    }
  });

  test('暗号化されたPDFをerrorとして検出する', async () => {
    const result = await runPreflightBatch([path.join(FIXTURES, 'encrypted.pdf')]);
    strictEqual(result.canProceed, false);
    assertError(result.errors[0]!, 'encrypted');
  });

  test('0ページのPDFをerrorとして検出する', async () => {
    const result = await runPreflightBatch([path.join(FIXTURES, 'nopage.pdf')]);
    strictEqual(result.canProceed, false);
    assertError(result.errors[0]!, 'no pages');
  });
});

suite('Preflight — SVG XML構造検査', () => {
  test('viewBoxを持つ有効なSVGをokとして検出する', async () => {
    const testRoot = await mkdtemp(path.join(os.tmpdir(), 'lgh-preflight-svg-xml-'));
    const sourcePath = path.join(testRoot, 'valid-viewbox.svg');

    try {
      await writeFile(
        sourcePath,
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="50" height="50"/></svg>',
      );
      const result = await runPreflightBatch([sourcePath]);
      strictEqual(result.canProceed, true);
      assertOk(result.reports[0]!);
      strictEqual(result.reports[0]!.details?.viewBox, '0 0 100 100');
    } finally {
      await rm(testRoot, { recursive: true, force: true });
    }
  });

  test('XML構造が不正なSVGをwarningとして検出する', async () => {
    const testRoot = await mkdtemp(path.join(os.tmpdir(), 'lgh-preflight-svg-broken-xml-'));
    const sourcePath = path.join(testRoot, 'broken.svg');

    try {
      await writeFile(sourcePath, 'not xml content <svg>');
      const result = await runPreflightBatch([sourcePath]);
      strictEqual(result.canProceed, true);
      assertWarning(result.warnings[0]!);
    } finally {
      await rm(testRoot, { recursive: true, force: true });
    }
  });
});

suite('Preflight — 進捗報告', () => {
  test('onProgress callbackが各ファイル完了後に呼ばれる', async () => {
    const calls: { completed: number; total: number }[] = [];
    const result = await runPreflightBatch(
      [path.join(FIXTURES, 'valid.pdf'), path.join(FIXTURES, 'valid.png'), path.join(FIXTURES, 'valid.svg')],
      {
        onProgress: (completed, total) => {
          calls.push({ completed, total });
        },
      },
    );
    strictEqual(result.canProceed, true);
    strictEqual(result.reports.length, 3);
    strictEqual(calls.length, 3);
    deepStrictEqual(calls[0]!, { completed: 1, total: 3 });
    deepStrictEqual(calls[2]!, { completed: 3, total: 3 });
  });
});

suite('Preflight — warning確認', () => {
  test('warning確認ハンドラがwarning一覧を受け取る', async () => {
    const testRoot = await mkdtemp(path.join(os.tmpdir(), 'lgh-preflight-warning-'));
    const sourcePath = path.join(testRoot, 'no-dim.svg');

    try {
      await writeFile(sourcePath, '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
      let receivedWarnings: PreflightReport[] | undefined;
      await rejects(
        assertPreflightPassed([{ sourcePath }], {
          onConfirmWarnings: async (warnings) => {
            receivedWarnings = warnings;
            return false;
          },
        }),
        (error: unknown) => error instanceof Error && error.name === 'AbortError',
      );
      ok(receivedWarnings !== undefined, 'onConfirmWarnings should have been called');
      strictEqual(receivedWarnings.length, 1);
      strictEqual(receivedWarnings[0]!.result, 'warning');
    } finally {
      await rm(testRoot, { recursive: true, force: true });
    }
  });

  test('warning確認でtrueを返すとエラーにならない', async () => {
    const testRoot = await mkdtemp(path.join(os.tmpdir(), 'lgh-preflight-warning-proceed-'));
    const sourcePath = path.join(testRoot, 'no-dim.svg');

    try {
      await writeFile(sourcePath, '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
      await assertPreflightPassed([{ sourcePath }], { onConfirmWarnings: async () => true });
    } finally {
      await rm(testRoot, { recursive: true, force: true });
    }
  });
});

suite('Preflight — レポート構造', () => {
  test('各レポートにformat、fileSize、resultが含まれる', async () => {
    const result = await runPreflightBatch([
      path.join(FIXTURES, 'valid.pdf'),
      path.join(FIXTURES, 'valid.png'),
      path.join(FIXTURES, 'valid.svg'),
      path.join(FIXTURES, 'valid.mmd'),
    ]);
    for (const report of result.reports) {
      ok(report.format, `missing format for ${report.sourcePath}`);
      ok(typeof report.fileSize === 'number', `missing fileSize for ${report.sourcePath}`);
      ok(['ok', 'warning', 'error'].includes(report.result), `invalid result for ${report.sourcePath}`);
    }
  });
});
