// Test target:
// - runExternalTool passes array args to executable and returns stdout/stderr
// - tool name and execution info are logged to Output Channel
// - secret arguments are redacted from logs but passed unchanged to the process
// - non-zero exit rejects and preserves stderr and original cause
// - AbortSignal cancels the child process without producing final output
//
// Mocked:
// - Output Channel (appendLine capture)
//
// Not tested:
// - actual external tool installation
// - platform-specific exit codes beyond non-zero

import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { runExternalTool } from '../../src/operations/external_tools/run_external_tool.js';

suite('外部tool runner — 正常実行', () => {
  test('executableへ配列argsを渡しstdoutとstderrを取得できる', async () => {
    const lines: string[] = [];
    const result = await runExternalTool({
      toolName: 'fixture-tool',
      executable: process.execPath,
      args: ['-e', "process.stdout.write('ok'); process.stderr.write('warn')"],
      outputChannel: { appendLine: (line) => lines.push(line) },
    });

    assert.strictEqual(result.stdout, 'ok');
    assert.strictEqual(result.stderr, 'warn');
  });

  test('tool名と実行情報をOutput Channelへ記録する', async () => {
    const lines: string[] = [];
    await runExternalTool({
      toolName: 'my-tool',
      executable: process.execPath,
      args: ['-e', '1'],
      outputChannel: { appendLine: (line) => lines.push(line) },
    });

    assert.ok(
      lines.some((line) => line.includes('[my-tool] executable:')),
      'should log executable',
    );
    assert.ok(
      lines.some((line) => line.includes('[my-tool] arguments:')),
      'should log arguments',
    );
  });
});

suite('外部tool runner — ログredaction', () => {
  test('secret argumentがログへ出ない', async () => {
    const lines: string[] = [];
    await runExternalTool({
      toolName: 'redact-tool',
      executable: process.execPath,
      args: ['-e', '1', 'super-secret-token'],
      outputChannel: { appendLine: (line) => lines.push(line) },
      redactArgument: (_argument, index) => (index === 2 ? '<redacted>' : _argument),
    });

    assert.ok(!lines.some((line) => line.includes('super-secret-token')), 'secret must not appear in logs');
  });

  test('redacted valueがログへ出る', async () => {
    const lines: string[] = [];
    await runExternalTool({
      toolName: 'redact-tool',
      executable: process.execPath,
      args: ['-e', '1', 'super-secret-token'],
      outputChannel: { appendLine: (line) => lines.push(line) },
      redactArgument: (_argument, index) => (index === 2 ? '<redacted>' : _argument),
    });

    assert.ok(
      lines.some((line) => line.includes('<redacted>')),
      'redacted value should appear in logs',
    );
  });

  test('processへは元のargumentが渡る', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-ext-tool-redaction-'));
    const receivedPath = path.join(workspacePath, 'received.txt');

    try {
      await runExternalTool({
        toolName: 'redact-tool',
        executable: process.execPath,
        args: [
          '-e',
          `require('fs').writeFileSync(${JSON.stringify(receivedPath)}, process.argv[process.argv.length - 1])`,
          'super-secret-token',
        ],
        redactArgument: (_argument, index) => (index === 2 ? '<redacted>' : _argument),
      });

      const received = await readFile(receivedPath, 'utf8');
      assert.strictEqual(received, 'super-secret-token', 'process should receive the original argument');
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });
});

suite('外部tool runner — 実行失敗', () => {
  test('non-zero exitをrejectする', async () => {
    await assert.rejects(
      runExternalTool({
        toolName: 'fail-tool',
        executable: process.execPath,
        args: ['-e', 'process.exit(1)'],
      }),
      (error: unknown) => error instanceof Error,
    );
  });

  test('stderrまたはerror messageをOutput Channelへ残す', async () => {
    const lines: string[] = [];
    await assert.rejects(
      runExternalTool({
        toolName: 'fail-tool',
        executable: process.execPath,
        args: ['-e', "process.stderr.write('boom'); process.exit(2)"],
        outputChannel: { appendLine: (line) => lines.push(line) },
      }),
    );

    assert.ok(
      lines.some((line) => line.includes('[fail-tool] failure:')),
      'should log failure',
    );
    assert.ok(
      lines.some((line) => line.includes('boom')),
      'should include stderr in failure log',
    );
  });

  test('元の失敗原因を失わない', async () => {
    try {
      await runExternalTool({
        toolName: 'fail-tool',
        executable: process.execPath,
        args: ['-e', 'process.exit(42)'],
      });
      assert.fail('should have rejected');
    } catch (error: unknown) {
      assert.ok(error instanceof Error);
      assert.ok('code' in error || 'stderr' in error || error.message.length > 0, 'should preserve error details');
    }
  });
});

suite('外部tool runner — Cancellation', () => {
  test('AbortSignalがrunExternalToolへ渡り、child processを停止する', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-ext-tool-cancel-'));
    const sentinelPath = path.join(workspacePath, 'sentinel.txt');
    const startedPath = path.join(workspacePath, 'started.txt');

    try {
      const controller = new AbortController();

      const promise = runExternalTool({
        toolName: 'long-tool',
        executable: process.execPath,
        args: [
          '-e',
          `require('fs').writeFileSync(${JSON.stringify(startedPath)}, 'started');
           setTimeout(() => require('fs').writeFileSync(${JSON.stringify(sentinelPath)}, 'done'), 30000);`,
        ],
        signal: controller.signal,
      });

      // Wait for the child process to write the started file (observable signal)
      await waitForFile(startedPath, 5000);

      controller.abort();

      await assert.rejects(promise, (error: unknown) => {
        assert.ok(error instanceof Error);
        return error.name === 'AbortError' || error.name === 'Canceled';
      });

      // The sentinel file should NOT exist (child was cancelled before completion)
      let sentinelExists = false;
      try {
        await import('node:fs/promises').then((fs) => fs.stat(sentinelPath));
        sentinelExists = true;
      } catch {
        sentinelExists = false;
      }
      assert.strictEqual(sentinelExists, false, 'sentinel file should not be created after abort');
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('abort後にfailure logへsecret argumentを漏らさない', async () => {
    const lines: string[] = [];
    const controller = new AbortController();

    const promise = runExternalTool({
      toolName: 'cancel-secret-tool',
      executable: process.execPath,
      args: ['-e', 'setTimeout(() => {}, 30000)', 'super-secret-token'],
      signal: controller.signal,
      outputChannel: { appendLine: (line) => lines.push(line) },
      redactArgument: (_argument, index) => (index === 2 ? '<redacted>' : _argument),
    });

    // Wait a moment for the process to start
    await new Promise((resolve) => setTimeout(resolve, 200));
    controller.abort();

    await assert.rejects(promise);

    assert.ok(!lines.some((line) => line.includes('super-secret-token')), 'secret must not leak in cancellation log');
  });
});

async function waitForFile(filePath: string, timeoutMs: number): Promise<void> {
  const fs = await import('node:fs/promises');
  const start = Date.now();

  for (;;) {
    try {
      await fs.stat(filePath);
      return;
    } catch {
      if (Date.now() - start > timeoutMs) {
        throw new Error(`File not created within ${timeoutMs}ms: ${filePath}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
}
