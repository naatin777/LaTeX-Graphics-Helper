/* oxlint-disable vitest/expect-expect */

import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const hookPath = fileURLToPath(new URL("../../.rulesync/hooks/stop-fix.sh", import.meta.url));
const temporaryRootPaths: string[] = [];

suite("Stop hookの検証専用動作", () => {
  teardown(async () => {
    await Promise.all(
      temporaryRootPaths.splice(0).map((root) => rm(root, { force: true, recursive: true })),
    );
  });

  test("dirty worktreeでもcheck:fixを実行せず検証する", async () => {
    const harness = await createHookHarness();
    await writeFile(path.join(harness.repositoryPath, "outside.txt"), "unrelated change\n");

    const result = await runHook(harness);
    const summary = JSON.parse(result.stdout) as { ok: boolean; logDirectory: string };

    assert.strictEqual(result.code, 1);
    assert.strictEqual(summary.ok, false);
    assert.deepStrictEqual(await readCalls(harness.callsPath), [
      ["run", "rulesync:check"],
      ["run", "lint"],
      ["run", "format"],
    ]);
    assert.match(result.stderr, /validation failed/i);
    assert.match(summary.logDirectory, /lgh-harness/);
    await assert.rejects(
      readFile(
        path.join(
          harness.repositoryPath,
          ".latex-graphics-helper",
          "logs",
          "stop-hook-check-fix.log",
        ),
      ),
    );
  });

  test("clean worktreeでも検証だけを実行しJSONを返す", async () => {
    const harness = await createHookHarness();
    const result = await runHook(harness);
    const summary = JSON.parse(result.stdout) as {
      ok: boolean;
      results: Array<{ status: number }>;
    };

    assert.strictEqual(result.code, 0);
    assert.strictEqual(summary.ok, true);
    assert.ok(summary.results.every((check) => check.status === 0));
    assert.deepStrictEqual(await readCalls(harness.callsPath), [
      ["run", "rulesync:check"],
      ["run", "lint"],
      ["run", "format"],
    ]);
  });

  test("検証commandの失敗を握り潰さず非zeroで返す", async () => {
    const harness = await createHookHarness({ fakePnpmExitCode: 7 });
    const result = await runHook(harness);
    const summary = JSON.parse(result.stdout) as { ok: boolean };

    assert.strictEqual(result.code, 1);
    assert.strictEqual(summary.ok, false);
    assert.match(result.stderr, /validation failed/i);
  });

  test("Git rootがない場合はJSONのエラーを返す", async () => {
    const harness = await createHookHarness({ initializeRepository: false });
    const result = await runHook(harness);
    const summary = JSON.parse(result.stdout) as { ok: boolean; error: string };

    assert.strictEqual(result.code, 1);
    assert.strictEqual(summary.ok, false);
    assert.match(summary.error, /git/i);
  });
});

interface HookHarness {
  callsPath: string;
  fakeBinPath: string;
  fakeProgramPath: string;
  fakePnpmExitCode: number;
  repositoryPath: string;
}

async function createHookHarness(
  options: { initializeRepository?: boolean; fakePnpmExitCode?: number } = {},
): Promise<HookHarness> {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "lgh stop hook 日本語-"));
  temporaryRootPaths.push(temporaryRoot);
  const repositoryPath = path.join(temporaryRoot, "repository");
  const fakeBinPath = path.join(temporaryRoot, "fake-bin");
  const fakeProgramPath = path.join(temporaryRoot, "fake-pnpm.cjs");
  const callsPath = path.join(temporaryRoot, "pnpm-calls.jsonl");
  await Promise.all([mkdir(repositoryPath), mkdir(fakeBinPath)]);
  await writeFile(
    path.join(fakeBinPath, "pnpm"),
    '#!/usr/bin/env sh\nexec node "$FAKE_PNPM_PROGRAM" "$@"\n',
  );
  await chmod(path.join(fakeBinPath, "pnpm"), 0o755);
  await writeFile(
    fakeProgramPath,
    [
      'const fs = require("node:fs");',
      "fs.appendFileSync(process.env.FAKE_PNPM_CALLS, `${JSON.stringify(process.argv.slice(2))}\\n`);",
      'process.exit(Number(process.env.FAKE_PNPM_EXIT_CODE ?? "0"));',
      "",
    ].join("\n"),
  );

  if (options.initializeRepository !== false) {
    await runGit(repositoryPath, ["init", "--quiet"]);
    await createValidTaskFixture(repositoryPath);
    await runGit(repositoryPath, ["add", "."]);
    await runGit(repositoryPath, [
      "-c",
      "user.name=LaTeX Graphics Helper Test",
      "-c",
      "user.email=test@example.com",
      "commit",
      "--quiet",
      "-m",
      "test fixture",
    ]);
  }
  return {
    callsPath,
    fakeBinPath,
    fakeProgramPath,
    fakePnpmExitCode: options.fakePnpmExitCode ?? 0,
    repositoryPath,
  };
}

async function createValidTaskFixture(repositoryPath: string): Promise<void> {
  await mkdir(path.join(repositoryPath, "docs", "tasks"), { recursive: true });
  await mkdir(path.join(repositoryPath, "docs", "adr"), { recursive: true });
  await writeFile(
    path.join(repositoryPath, "docs", "tasks", "README.md"),
    "## Current Task\n\n- [0188](0188.md)\n",
  );
  await writeFile(
    path.join(repositoryPath, "docs", "tasks", "0188.md"),
    [
      "## Status",
      "In Progress",
      "",
      "## Change Contract",
      "",
      "### Problem",
      "fixture",
      "",
      "### Allowed behaviors",
      "- B-001: validate",
      "",
      "### Allowed files",
      "- `unrelated.txt`",
      "",
      "### Evidence matrix",
      "| Behavior | Test | Evidence type |",
      "| --- | --- | --- |",
      "| B-001 | fixture | script |",
      "",
      "### Dependencies",
      "- Blocked by: none",
      "",
      "### Not changing",
      "- production",
      "",
      "### Related",
      "- [ADR](../adr/0014.md)",
      "",
    ].join("\n"),
  );
  await writeFile(path.join(repositoryPath, "docs", "adr", "0014.md"), "# fixture ADR\n");
  await writeFile(path.join(repositoryPath, "unrelated.txt"), "baseline\n");
}

async function runHook(
  harness: HookHarness,
): Promise<{ code: number | null; stderr: string; stdout: string }> {
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    FAKE_PNPM_CALLS: harness.callsPath,
    FAKE_PNPM_EXIT_CODE: String(harness.fakePnpmExitCode),
    FAKE_PNPM_PROGRAM: harness.fakeProgramPath,
    PATH: [harness.fakeBinPath, process.env.PATH].filter(Boolean).join(path.delimiter),
  };
  const shell = process.platform === "win32" ? "sh.exe" : "sh";
  return new Promise((resolve, reject) => {
    const child = spawn(shell, [hookPath], { cwd: harness.repositoryPath, env: environment });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => (stdout += chunk));
    child.stderr.on("data", (chunk: string) => (stderr += chunk));
    child.once("error", reject);
    child.once("close", (code) => resolve({ code, stderr, stdout }));
  });
}

async function runGit(repositoryPath: string, args: string[]): Promise<void> {
  await execFileAsync("git", args, { cwd: repositoryPath });
}

async function readCalls(callsPath: string): Promise<string[][]> {
  try {
    return (await readFile(callsPath, "utf8"))
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as string[]);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
