/* oxlint-disable vitest/expect-expect */

// Test target:
// - 直前の変換出力が生成時から変更されていない場合だけ、全出力を削除すること
// - 変更、欠損、workspace外symlinkが1件でもあれば、削除を開始しないこと
//
// Mocked:
// - なし。実ファイルと実際のSHA-256計算を使用する
//
// Not tested:
// - VS Codeの通知UI
// - command登録
// - crop処理

import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createConversionUndoRecord,
  undoConversionOutputs,
} from "../src/operations/undo_last_conversion.js";

suite("undoConversionOutputs", () => {
  test("deletes all unchanged outputs and keeps workspace staging files", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-undo-workspace-"));
    const firstOutputPath = path.join(workspacePath, "output", "first.pdf");
    const secondOutputPath = path.join(workspacePath, "output", "second.pdf");
    const stagedOutputPath = path.join(
      workspacePath,
      ".latex-graphics-helper",
      "crop-pdf",
      "run",
      "result.pdf",
    );
    await writeFixture(firstOutputPath, "first");
    await writeFixture(secondOutputPath, "second");
    await writeFixture(stagedOutputPath, "staged");

    const record = await createConversionUndoRecord([
      { outputPath: firstOutputPath, workspacePath },
      { outputPath: secondOutputPath, workspacePath },
    ]);

    await undoConversionOutputs(record);

    await assert.rejects(access(firstOutputPath));
    await assert.rejects(access(secondOutputPath));
    await assert.doesNotReject(access(stagedOutputPath));
  });

  test("does not delete any output when one output was modified", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-undo-workspace-"));
    const firstOutputPath = path.join(workspacePath, "first.pdf");
    const secondOutputPath = path.join(workspacePath, "second.pdf");
    await writeFixture(firstOutputPath, "first");
    await writeFixture(secondOutputPath, "second");

    const record = await createConversionUndoRecord([
      { outputPath: firstOutputPath, workspacePath },
      { outputPath: secondOutputPath, workspacePath },
    ]);
    await writeFile(secondOutputPath, "edited");

    await assert.rejects(undoConversionOutputs(record), /changed after conversion/);
    await assert.doesNotReject(access(firstOutputPath));
    await assert.doesNotReject(access(secondOutputPath));
  });

  test("does not delete any output when one output is missing", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-undo-workspace-"));
    const firstOutputPath = path.join(workspacePath, "first.pdf");
    const secondOutputPath = path.join(workspacePath, "second.pdf");
    await writeFixture(firstOutputPath, "first");
    await writeFixture(secondOutputPath, "second");

    const record = await createConversionUndoRecord([
      { outputPath: firstOutputPath, workspacePath },
      { outputPath: secondOutputPath, workspacePath },
    ]);
    await rm(secondOutputPath);

    await assert.rejects(undoConversionOutputs(record));
    await assert.doesNotReject(access(firstOutputPath));
  });

  test("does not delete any output when one path becomes a symlink outside the workspace", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-undo-workspace-"));
    const outsidePath = path.join(
      await mkdtemp(path.join(os.tmpdir(), "lgh-undo-outside-")),
      "outside.pdf",
    );
    const firstOutputPath = path.join(workspacePath, "first.pdf");
    const secondOutputPath = path.join(workspacePath, "second.pdf");
    await writeFixture(outsidePath, "outside");
    await writeFixture(firstOutputPath, "first");
    await writeFixture(secondOutputPath, "second");

    const record = await createConversionUndoRecord([
      { outputPath: firstOutputPath, workspacePath },
      { outputPath: secondOutputPath, workspacePath },
    ]);
    await rm(secondOutputPath);
    await symlink(outsidePath, secondOutputPath);

    await assert.rejects(undoConversionOutputs(record), /outside the workspace/);
    await assert.doesNotReject(access(firstOutputPath));
    await assert.doesNotReject(access(outsidePath));
  });

  test("restores the previous file after an overwritten output is undone", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-undo-workspace-"));
    const outputPath = path.join(workspacePath, "output.pdf");
    const previousFilePath = path.join(workspacePath, ".latex-graphics-helper", "output.previous");
    await writeFixture(outputPath, "generated");
    await writeFixture(previousFilePath, "original");

    const record = await createConversionUndoRecord([
      { outputPath, workspacePath, previousFilePath },
    ]);

    await undoConversionOutputs(record);

    assert.strictEqual(await readFile(outputPath, "utf8"), "original");
    await assert.doesNotReject(access(previousFilePath));
  });

  test("does not restore an overwritten output when it changed after conversion", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-undo-workspace-"));
    const outputPath = path.join(workspacePath, "output.pdf");
    const previousFilePath = path.join(workspacePath, ".latex-graphics-helper", "output.previous");
    await writeFixture(outputPath, "generated");
    await writeFixture(previousFilePath, "original");

    const record = await createConversionUndoRecord([
      { outputPath, workspacePath, previousFilePath },
    ]);
    await writeFile(outputPath, "edited");

    await assert.rejects(undoConversionOutputs(record), /changed after conversion/);
    assert.strictEqual(await readFile(outputPath, "utf8"), "edited");
  });
});

async function writeFixture(filePath: string, contents: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents);
}
