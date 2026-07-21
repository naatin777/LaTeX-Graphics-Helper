/* oxlint-disable vitest/expect-expect */

import { ok, strictEqual } from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runPreflightBatch, type PreflightReport } from '../src/operations/input_preflight.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(testDirectory, '..', '..', 'test', 'fixtures', 'preflight');
const EPS_FIXTURES = path.join(testDirectory, '..', '..', 'test', 'fixtures', 'eps');

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

  test('未対応の拡張子をerrorとして検出する', async () => {
    const result = await runPreflightBatch([path.join(FIXTURES, 'valid.pdf') + '.unknown']);
    strictEqual(result.canProceed, false);
    assertError(result.errors[0]!, 'Unsupported format');
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
    // valid files should have passed
    const oks = result.reports.filter((r) => r.result === 'ok');
    strictEqual(oks.length, 2);
  });

  test('全件okの場合はcanProceedがtrue', async () => {
    const result = await runPreflightBatch([path.join(FIXTURES, 'valid.pdf'), path.join(FIXTURES, 'valid.png')]);
    strictEqual(result.canProceed, true);
    strictEqual(result.errors.length, 0);
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

  test('破損したPNGをerrorとして検出する', async () => {
    const result = await runPreflightBatch([path.join(FIXTURES, 'corrupted.png')]);
    strictEqual(result.canProceed, false);
    assertError(result.errors[0]!, 'Image validation failed');
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
