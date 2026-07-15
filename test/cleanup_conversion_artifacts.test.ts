/* oxlint-disable vitest/expect-expect */

import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  cleanupConversionArtifacts,
  cleanupStaleWorkspaceStaging,
} from "../src/operations/cleanup_conversion_artifacts.js";

suite("変換artifactのライフサイクル", () => {
  test("Undo用backupを残してstaging結果と入力コピーを削除する", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-cleanup-workspace-"));
    const rootPath = path.join(workspacePath, ".latex-graphics-helper", "run");
    const resultPath = path.join(rootPath, "result.pdf");
    const sourcePath = path.join(rootPath, "source.pdf");
    const backupPath = path.join(rootPath, "result.pdf.previous");

    try {
      await writeFixture(resultPath);
      await writeFixture(sourcePath);
      await writeFixture(backupPath);

      await cleanupConversionArtifacts([{ rootPath, workspacePath, preservePaths: [backupPath] }]);

      await assert.rejects(access(resultPath));
      await assert.rejects(access(sourcePath));
      await assert.doesNotReject(access(backupPath));
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test("workspace外へ解決するsymlinkをcleanupしない", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-cleanup-workspace-"));
    const outsidePath = await mkdtemp(path.join(os.tmpdir(), "lgh-cleanup-outside-"));
    const outsideFile = path.join(outsidePath, "keep.txt");
    const symlinkPath = path.join(workspacePath, ".latex-graphics-helper", "run");

    try {
      await writeFixture(outsideFile);
      await mkdir(path.dirname(symlinkPath), { recursive: true });
      await symlink(outsidePath, symlinkPath);

      await cleanupConversionArtifacts([{ rootPath: symlinkPath, workspacePath }]);

      await assert.doesNotReject(access(outsideFile));
      await assert.doesNotReject(access(symlinkPath));
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
      await rm(outsidePath, { recursive: true, force: true });
    }
  });

  test("cleanup失敗を成功結果へ伝播させずworkspace内の出力を維持する", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-cleanup-workspace-"));
    const outsidePath = await mkdtemp(path.join(os.tmpdir(), "lgh-cleanup-outside-"));
    const outputPath = path.join(workspacePath, "output.pdf");
    const symlinkPath = path.join(workspacePath, ".latex-graphics-helper", "run");

    try {
      await writeFixture(outputPath);
      await mkdir(path.dirname(symlinkPath), { recursive: true });
      await symlink(outsidePath, symlinkPath);

      await cleanupConversionArtifacts([{ rootPath: symlinkPath, workspacePath }]);

      await assert.doesNotReject(access(outputPath));
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
      await rm(outsidePath, { recursive: true, force: true });
    }
  });

  test("拡張機能起動相当のcleanupで前回セッションのstagingを削除する", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-cleanup-workspace-"));
    const stalePath = path.join(
      workspacePath,
      ".latex-graphics-helper",
      "merge-pdf",
      "old",
      "result.pdf",
    );

    try {
      await writeFixture(stalePath);
      await cleanupStaleWorkspaceStaging([workspacePath]);
      await assert.rejects(access(stalePath));
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });
});

async function writeFixture(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, "fixture");
}
