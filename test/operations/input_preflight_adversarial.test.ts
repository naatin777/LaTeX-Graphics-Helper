import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { assertPreflightPassed, runPreflightBatch } from '../../src/operations/input/input_preflight.js';

suite('Preflight adversarial inputs', () => {
  let testRootPath: string;

  setup(async () => {
    testRootPath = await mkdtemp(path.join(os.tmpdir(), 'lgh-preflight-adversarial-'));
  });

  teardown(async () => {
    await rm(testRootPath, { recursive: true, force: true });
  });

  test('streams a multi-chunk Mermaid file without truncating it', async () => {
    const sourcePath = path.join(testRootPath, 'large.mmd');
    const edgeCount = 20_000;
    await writeFile(sourcePath, `graph TD\n${'A-->B\n'.repeat(edgeCount)}`);

    const result = await runPreflightBatch([sourcePath]);

    assert.equal(result.canProceed, true);
    assert.equal(result.errors.length, 0);
    assert.equal(result.reports[0]?.result, 'ok');
    assert.equal(result.reports[0]?.details?.lines, edgeCount + 2);
  });

  test('does not reject an SVG based only on pixel count', async () => {
    const sourcePath = path.join(testRootPath, 'large-dimensions.svg');
    await writeFile(
      sourcePath,
      '<svg xmlns="http://www.w3.org/2000/svg" width="20000" height="20000"><rect width="1" height="1" /></svg>',
    );

    const result = await runPreflightBatch([sourcePath]);

    assert.equal(result.canProceed, true);
    assert.equal(result.errors.length, 0);
    assert.equal(result.reports[0]?.result, 'ok');
  });

  test('finds Draw.io structure when a marker is split across stream chunks', async () => {
    const sourcePath = path.join(testRootPath, 'split-marker.drawio');
    const prefix = ' '.repeat(64 * 1024 - 3);
    await writeFile(sourcePath, `${prefix}<mxfile><diagram /></mxfile>`);

    const result = await runPreflightBatch([sourcePath]);

    assert.equal(result.canProceed, true);
    assert.equal(result.reports[0]?.result, 'ok');
  });

  test('does not decode editable Draw.io PNG bytes as UTF-8 text', async () => {
    const sourcePath = path.join(testRootPath, 'diagram.drawio.png');
    await writeFile(sourcePath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0xff, 0xfe, 0xfd]));

    const result = await runPreflightBatch([sourcePath]);

    assert.equal(result.canProceed, true);
    assert.equal(result.reports[0]?.result, 'ok');
  });

  test('includes every failing input path in the batch error', async () => {
    const firstPath = path.join(testRootPath, 'first.pdf');
    const secondPath = path.join(testRootPath, 'second.png');

    await assert.rejects(
      assertPreflightPassed([{ sourcePath: firstPath }, { sourcePath: secondPath }]),
      (error: unknown) =>
        error instanceof Error && error.message.includes(firstPath) && error.message.includes(secondPath),
    );
  });
});
