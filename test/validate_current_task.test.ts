/* oxlint-disable vitest/expect-expect */

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = path.join(process.cwd(), "scripts", "validate-current-task.mjs");
const temporaryRoots: string[] = [];

suite("Current Task preflight", () => {
  teardown(async () => {
    await Promise.all(
      temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
    );
  });

  test("現行taskの必須sectionと変更範囲を検証できる", async () => {
    const result = await execFileAsync(process.execPath, [
      scriptPath,
      "--root",
      process.cwd(),
      "--files",
      "scripts/validate-current-task.mjs",
    ]);
    const parsed = JSON.parse(result.stdout) as { ok: boolean; status: string };
    assert.strictEqual(parsed.ok, true);
    assert.strictEqual(parsed.status, "In Progress");
  });

  test("Allowed files外の変更を失敗にする", async () => {
    const root = await createFixture();
    try {
      await execFileAsync(process.execPath, [scriptPath, "--root", root, "--files", "outside.txt"]);
      assert.fail("preflight should reject an outside file");
    } catch (error) {
      assert.match(String((error as { stdout?: string }).stdout), /outside Allowed files/);
    }
  });
});

async function createFixture(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "lgh task preflight-"));
  temporaryRoots.push(root);
  await mkdir(path.join(root, "docs", "tasks"), { recursive: true });
  await mkdir(path.join(root, "docs", "adr"), { recursive: true });
  await writeFile(
    path.join(root, "docs", "tasks", "README.md"),
    "## Current Task\n\n- [task](task.md)\n",
  );
  await writeFile(
    path.join(root, "docs", "tasks", "task.md"),
    [
      "## Status",
      "In Progress",
      "",
      "## Change Contract",
      "",
      "### Allowed behaviors",
      "- B-001: behavior",
      "",
      "### Allowed files",
      "- `inside.txt`",
      "",
      "### Evidence matrix",
      "| Behavior | Test | Evidence |",
      "| --- | --- | --- |",
      "| B-001 | test | fixture |",
      "",
      "### Dependencies",
      "- Blocked by: none",
      "",
      "### Not changing",
      "- other behavior",
      "",
      "### Related",
      "- [ADR](../adr/adr.md)",
      "",
    ].join("\n"),
  );
  await writeFile(path.join(root, "docs", "adr", "adr.md"), "# ADR\n");
  return root;
}
