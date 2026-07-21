/* oxlint-disable vitest/expect-expect */

import { ok, strictEqual } from 'node:assert/strict';
import path from 'node:path';

import { sourceFormatForPath } from '../src/application/source_format.js';
import { validateEpsInput } from '../src/operations/eps_to_pdf.js';

const FIXTURES_DIR = path.resolve('test', 'fixtures', 'eps');

suite('EPS preflight validation', () => {
  test('accepts a valid minimal EPS file', () => {
    const epsPath = path.join(FIXTURES_DIR, 'minimal.eps');
    // Should not throw
    validateEpsInput(epsPath);
    ok(true, 'validateEpsInput did not throw for valid EPS');
  });

  test('rejects a file without PostScript header', () => {
    const epsPath = path.join(FIXTURES_DIR, 'no-header.eps');
    try {
      validateEpsInput(epsPath);
    } catch (error) {
      strictEqual(
        (error as Error).message.includes('PostScript header'),
        true,
        `Unexpected error message: ${(error as Error).message}`,
      );
      return;
    }
    ok(false, 'Expected validateEpsInput to throw');
  });

  test('rejects EPS with invalid BoundingBox', () => {
    const epsPath = path.join(FIXTURES_DIR, 'invalid-bbox.eps');
    try {
      validateEpsInput(epsPath);
    } catch (error) {
      strictEqual(
        (error as Error).message.includes('Invalid BoundingBox'),
        true,
        `Unexpected error message: ${(error as Error).message}`,
      );
      return;
    }
    ok(false, 'Expected validateEpsInput to throw');
  });
});

suite('EPS source format detection', () => {
  test('detects .eps extension as eps format', () => {
    strictEqual(sourceFormatForPath('/test/file.eps'), 'eps');
    strictEqual(sourceFormatForPath('/test/FILE.EPS'), 'eps');
  });
});
