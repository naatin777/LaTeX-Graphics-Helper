/* oxlint-disable vitest/expect-expect */

import assert from 'node:assert/strict';

import { runExternalTool } from '../src/operations/run_external_tool.js';

suite('外部tool runner', () => {
  test('配列args・signal・ログredactionを共通処理する', async () => {
    const lines: string[] = [];
    const result = await runExternalTool({
      toolName: 'fixture-tool',
      executable: process.execPath,
      args: ['-e', "process.stdout.write('ok')", 'secret'],
      outputChannel: { appendLine: (line) => lines.push(line) },
      redactArgument: (_argument, index) => (index === 2 ? '<redacted>' : _argument),
    });

    assert.strictEqual(result.stdout, 'ok');
    assert.ok(lines.some((line) => line.includes('fixture-tool')));
    assert.ok(lines.some((line) => line.includes('<redacted>')));
    assert.ok(!lines.some((line) => line.includes('secret')));
  });
});
