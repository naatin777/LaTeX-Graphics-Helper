/* oxlint-disable vitest/expect-expect */

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import * as vscode from 'vscode';

const execFileAsync = promisify(execFile);

suite('NLS consistency check', () => {
  test('英日NLSのkeyとplaceholderを検証できる', async () => {
    const extension = vscode.extensions.getExtension('naatin777.latex-graphics-helper');
    assert.ok(extension);

    const scriptPath = path.join(extension.extensionPath, 'scripts', 'check-nls.mjs');
    const result = await execFileAsync(process.execPath, [scriptPath], {
      cwd: extension.extensionPath,
    });
    assert.match(result.stdout, /NLS consistency OK/);
    assert.strictEqual(result.stderr, '');
  });
});
