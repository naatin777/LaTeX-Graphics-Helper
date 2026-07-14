/* oxlint-disable vitest/expect-expect */

// Test target:
// - Stop hookが既存差分を変更せず、clean時だけcheck:fixを実行すること
// - 成功、skip、失敗のいずれでもstdoutをJSONだけに保つこと
//
// Mocked:
// - pnpm run check:fixの呼び出しとfile変更
//
// Not tested:
// - 実際のlint / format処理
// - 各AI toolがStop hookを起動するUI

import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const hookPath = fileURLToPath(new URL("../../.rulesync/hooks/stop-fix.sh", import.meta.url));
const temporaryRootPaths: string[] = [];

interface HookHarness {
  callsPath: string;
  fakeBinPath: string;
  fakeProgramPath: string;
  repositoryPath: string;
}

interface HookRunOptions {
  exitCode?: number;
  writeContent?: string;
  writePath?: string;
}

interface HookRunResult {
  code: number | null;
  stderr: string;
  stdout: string;
}

suite("Stop hookのdirty worktree保護", () => {
  teardown(async () => {
    await Promise.all(
      temporaryRootPaths
        .splice(0)
        .map((temporaryRootPath) => rm(temporaryRootPath, { force: true, recursive: true })),
    );
  });

  test("clean worktreeではcheck:fixを1回実行する", async () => {
    const harness = await createHookHarness();

    const result = await runHook(harness);

    assert.strictEqual(result.code, 0);
    assertJsonOnly(result.stdout);
    assert.strictEqual(result.stderr, "");
    assert.deepStrictEqual(await readCalls(harness.callsPath), [["run", "check:fix"]]);
  });

  test("task対象fileだけがdirtyでも自動修正せず内容を維持する", async () => {
    const harness = await createHookHarness();
    const taskFilePath = path.join(harness.repositoryPath, "task-file.txt");
    await writeFile(taskFilePath, "task change\n");

    const result = await runHook(harness, {
      writeContent: "unexpected formatter change\n",
      writePath: taskFilePath,
    });

    assert.strictEqual(await readFile(taskFilePath, "utf8"), "task change\n");
    assert.deepStrictEqual(await readCalls(harness.callsPath), []);
    assert.strictEqual(result.code, 0);
    assertJsonOnly(result.stdout);
    assert.match(result.stderr, /dirty worktree/i);
  });

  test("staged・unstaged・多言語の未追跡fileがあれば自動修正しない", async () => {
    const harness = await createHookHarness();
    const taskFilePath = path.join(harness.repositoryPath, "task-file.txt");
    const unrelatedFilePath = path.join(harness.repositoryPath, "unrelated-file.txt");
    const untrackedFilePath = path.join(harness.repositoryPath, "未追跡 🌹　file.txt");
    await writeFile(taskFilePath, "staged change\n");
    await runGit(harness.repositoryPath, ["add", "task-file.txt"]);
    await writeFile(unrelatedFilePath, "unstaged change\n");
    await writeFile(untrackedFilePath, "untracked\n");

    const result = await runHook(harness, {
      writeContent: "unexpected formatter change\n",
      writePath: taskFilePath,
    });

    assert.strictEqual(await readFile(taskFilePath, "utf8"), "staged change\n");
    assert.strictEqual(await readFile(unrelatedFilePath, "utf8"), "unstaged change\n");
    assert.strictEqual(await readFile(untrackedFilePath, "utf8"), "untracked\n");
    assert.deepStrictEqual(await readCalls(harness.callsPath), []);
    assert.strictEqual(result.code, 0);
    assertJsonOnly(result.stdout);
    assert.match(result.stderr, /dirty worktree/i);
  });

  test("check:fixが途中で失敗しても変更を復元せずJSONを維持する", async () => {
    const harness = await createHookHarness();
    const taskFilePath = path.join(harness.repositoryPath, "task-file.txt");

    const result = await runHook(harness, {
      exitCode: 7,
      writeContent: "partially formatted\n",
      writePath: taskFilePath,
    });

    assert.strictEqual(await readFile(taskFilePath, "utf8"), "partially formatted\n");
    assert.deepStrictEqual(await readCalls(harness.callsPath), [["run", "check:fix"]]);
    assert.strictEqual(result.code, 1);
    assertJsonOnly(result.stdout);
    assert.match(result.stderr, /check:fix failed/i);
  });

  test("Git rootを確認できなければpnpmを実行せず安全にskipする", async () => {
    const harness = await createHookHarness({ initializeRepository: false });

    const result = await runHook(harness);

    assert.deepStrictEqual(await readCalls(harness.callsPath), []);
    assert.strictEqual(result.code, 0);
    assertJsonOnly(result.stdout);
    assert.match(result.stderr, /Git root/i);
  });
});

async function createHookHarness(
  options: { initializeRepository?: boolean } = {},
): Promise<HookHarness> {
  const temporaryRootPath = await mkdtemp(path.join(os.tmpdir(), "lgh stop hook 日本語-"));
  temporaryRootPaths.push(temporaryRootPath);

  const repositoryPath = path.join(temporaryRootPath, "repository");
  const fakeBinPath = path.join(temporaryRootPath, "fake-bin");
  const fakeProgramPath = path.join(temporaryRootPath, "fake-pnpm.cjs");
  const callsPath = path.join(temporaryRootPath, "pnpm-calls.jsonl");
  await Promise.all([mkdir(repositoryPath), mkdir(fakeBinPath)]);
  await writeFakePnpm(fakeBinPath, fakeProgramPath);

  if (options.initializeRepository !== false) {
    await runGit(repositoryPath, ["init", "--quiet"]);
    await Promise.all([
      writeFile(path.join(repositoryPath, ".gitignore"), ".latex-graphics-helper/\n"),
      writeFile(path.join(repositoryPath, "task-file.txt"), "task baseline\n"),
      writeFile(path.join(repositoryPath, "unrelated-file.txt"), "unrelated baseline\n"),
    ]);
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

  return { callsPath, fakeBinPath, fakeProgramPath, repositoryPath };
}

async function writeFakePnpm(fakeBinPath: string, fakeProgramPath: string): Promise<void> {
  const fakePnpmPath = path.join(fakeBinPath, "pnpm");
  await Promise.all([
    writeFile(fakePnpmPath, '#!/usr/bin/env sh\nexec node "$FAKE_PNPM_PROGRAM" "$@"\n'),
    writeFile(
      fakeProgramPath,
      [
        'const fs = require("node:fs");',
        "fs.appendFileSync(process.env.FAKE_PNPM_CALLS, `${JSON.stringify(process.argv.slice(2))}\\n`);",
        "if (process.env.FAKE_PNPM_WRITE_PATH) {",
        "  fs.writeFileSync(process.env.FAKE_PNPM_WRITE_PATH, process.env.FAKE_PNPM_WRITE_CONTENT);",
        "}",
        'process.stdout.write("fake pnpm stdout\\n");',
        'process.stderr.write("fake pnpm stderr\\n");',
        'process.exit(Number(process.env.FAKE_PNPM_EXIT_CODE ?? "0"));',
        "",
      ].join("\n"),
    ),
  ]);
  await chmod(fakePnpmPath, 0o755);
}

async function runHook(harness: HookHarness, options: HookRunOptions = {}): Promise<HookRunResult> {
  const shellPath = await resolveShellPath();
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    FAKE_PNPM_CALLS: harness.callsPath,
    FAKE_PNPM_EXIT_CODE: String(options.exitCode ?? 0),
    FAKE_PNPM_PROGRAM: harness.fakeProgramPath,
    FAKE_PNPM_WRITE_CONTENT: options.writeContent ?? "",
    FAKE_PNPM_WRITE_PATH: options.writePath ?? "",
    PATH: [harness.fakeBinPath, process.env.PATH].filter(Boolean).join(path.delimiter),
  };

  return new Promise((resolve, reject) => {
    const child = spawn(shellPath, [toShellPath(hookPath)], {
      cwd: harness.repositoryPath,
      env: environment,
    });
    let stderr = "";
    let stdout = "";
    child.stderr.setEncoding("utf8");
    child.stdout.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.once("error", reject);
    child.once("close", (code) => {
      resolve({ code, stderr, stdout });
    });
  });
}

async function resolveShellPath(): Promise<string> {
  if (process.platform !== "win32") {
    return "sh";
  }

  const { stdout } = await execFileAsync("git", ["--exec-path"], { encoding: "utf8" });
  return path.resolve(stdout.trim(), "..", "..", "..", "bin", "sh.exe");
}

function toShellPath(filePath: string): string {
  return process.platform === "win32" ? filePath.replaceAll("\\", "/") : filePath;
}

async function runGit(repositoryPath: string, arguments_: string[]): Promise<void> {
  await execFileAsync("git", arguments_, { cwd: repositoryPath });
}

async function readCalls(callsPath: string): Promise<string[][]> {
  let contents: string;
  try {
    contents = await readFile(callsPath, "utf8");
  } catch (error) {
    if (isErrorCode(error, "ENOENT")) {
      return [];
    }
    throw error;
  }

  return contents
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as string[]);
}

function isErrorCode(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === code;
}

function assertJsonOnly(stdout: string): void {
  assert.strictEqual(stdout, "{}\n");
  assert.deepStrictEqual(JSON.parse(stdout), {});
}
