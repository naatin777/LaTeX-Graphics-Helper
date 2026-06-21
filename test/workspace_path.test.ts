/* oxlint-disable vitest/expect-expect */

// Test target:
// - workspace内外を論理パスと実体パスの両方で判定すること
// - 未作成の書き込み先では最も近い既存親を検証すること
//
// Mocked:
// - なし。実際の一時ディレクトリとsymlinkを使用する。
//
// Not tested:
// - OS自体のアクセス制御
// - 検証後に別プロセスがsymlinkを差し替える競合の完全防止
// - execPathの実行可否

import assert from "node:assert/strict";
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  assertExistingPathInWorkspace,
  assertWritablePathInWorkspace,
} from "../src/security/workspace_path.js";

suite("workspace path security", () => {
  test("allows an existing file inside the workspace", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-workspace-"));
    const sourcePath = path.join(workspacePath, "figures", "sample.pdf");
    await mkdir(path.dirname(sourcePath), { recursive: true });
    await writeFile(sourcePath, "pdf");

    await assert.doesNotReject(assertExistingPathInWorkspace(sourcePath, workspacePath));
  });

  test("allows a not-yet-created write path inside the workspace", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-workspace-"));
    const outputPath = path.join(workspacePath, "generated", "nested", "sample.pdf");

    await assert.doesNotReject(assertWritablePathInWorkspace(outputPath, workspacePath));
  });

  test("rejects an existing file outside the workspace", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-workspace-"));
    const outsidePath = path.join(
      await mkdtemp(path.join(os.tmpdir(), "lgh-outside-")),
      "sample.pdf",
    );
    await writeFile(outsidePath, "pdf");

    await assert.rejects(
      assertExistingPathInWorkspace(outsidePath, workspacePath),
      /outside the workspace/,
    );
  });

  test("rejects a not-yet-created write path outside the workspace", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-workspace-"));
    const outsidePath = path.join(
      await mkdtemp(path.join(os.tmpdir(), "lgh-outside-")),
      "new",
      "sample.pdf",
    );

    await assert.rejects(
      assertWritablePathInWorkspace(outsidePath, workspacePath),
      /outside the workspace/,
    );
  });

  test("rejects a sibling directory that only shares the workspace prefix", async () => {
    const parentPath = await mkdtemp(path.join(os.tmpdir(), "lgh-prefix-"));
    const workspacePath = path.join(parentPath, "project");
    const siblingPath = path.join(parentPath, "project-backup", "sample.pdf");
    await mkdir(workspacePath);
    await mkdir(path.dirname(siblingPath));
    await writeFile(siblingPath, "pdf");

    await assert.rejects(
      assertExistingPathInWorkspace(siblingPath, workspacePath),
      /outside the workspace/,
    );
  });

  test("rejects reading through a symlink to outside the workspace", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-workspace-"));
    const outsideDirectory = await mkdtemp(path.join(os.tmpdir(), "lgh-outside-"));
    const outsideFile = path.join(outsideDirectory, "sample.pdf");
    const linkedDirectory = path.join(workspacePath, "linked");
    await writeFile(outsideFile, "pdf");
    await createDirectorySymlink(outsideDirectory, linkedDirectory);

    await assert.rejects(
      assertExistingPathInWorkspace(path.join(linkedDirectory, "sample.pdf"), workspacePath),
      /outside the workspace/,
    );
  });

  test("rejects writing through a symlink to outside the workspace", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-workspace-"));
    const outsideDirectory = await mkdtemp(path.join(os.tmpdir(), "lgh-outside-"));
    const linkedDirectory = path.join(workspacePath, "linked");
    await createDirectorySymlink(outsideDirectory, linkedDirectory);

    await assert.rejects(
      assertWritablePathInWorkspace(path.join(linkedDirectory, "new", "sample.pdf"), workspacePath),
      /outside the workspace/,
    );
  });

  test("allows paths inside a workspace that is itself a symlink", async () => {
    const actualWorkspace = await mkdtemp(path.join(os.tmpdir(), "lgh-workspace-"));
    const symlinkParent = await mkdtemp(path.join(os.tmpdir(), "lgh-workspace-link-"));
    const workspacePath = path.join(symlinkParent, "project");
    const sourcePath = path.join(actualWorkspace, "sample.pdf");
    await writeFile(sourcePath, "pdf");
    await createDirectorySymlink(actualWorkspace, workspacePath);

    await assert.doesNotReject(
      assertExistingPathInWorkspace(path.join(workspacePath, "sample.pdf"), workspacePath),
    );
  });
});

async function createDirectorySymlink(target: string, linkPath: string): Promise<void> {
  await symlink(target, linkPath, process.platform === "win32" ? "junction" : "dir");
}
