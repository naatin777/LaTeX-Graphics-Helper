/* oxlint-disable vitest/expect-expect */

// Test target:
// - 変換結果の競合を1回の判断で安全に反映すること
// - keep-both、cancel、overwriteとバックアップの挙動
//
// Mocked:
// - 競合時のユーザー判断
//
// Not tested:
// - VS Codeのwarning dialog
// - 変換処理そのもの

import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { commitConversionOutputs } from "../src/operations/commit_conversion_outputs.js";

suite("変換結果の反映処理", () => {
  test("両方残す場合は最小の連番suffixで保存する", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-commit-test-"));
    const stagedOutputPath = path.join(workspacePath, ".latex-graphics-helper", "result.pdf");
    const outputPath = path.join(workspacePath, "sample.pdf");
    await writeFixture(stagedOutputPath, "new");
    await writeFixture(outputPath, "old");
    await writeFixture(path.join(workspacePath, "sample-1.pdf"), "old-1");

    const committed = await commitConversionOutputs(
      [{ stagedOutputPath, outputPath, workspacePath }],
      { resolveConflicts: async () => "keep-both" },
    );

    assert.strictEqual(committed[0]?.outputPath, path.join(workspacePath, "sample-2.pdf"));
    assert.strictEqual(await readFile(outputPath, "utf8"), "old");
    assert.strictEqual(await readFile(path.join(workspacePath, "sample-2.pdf"), "utf8"), "new");
  });

  test("複数の競合があっても判断は1回だけ求める", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-commit-test-"));
    const outputs = await Promise.all(
      ["first", "second"].map(async (name) => {
        const stagedOutputPath = path.join(workspacePath, ".latex-graphics-helper", `${name}.pdf`);
        const outputPath = path.join(workspacePath, `${name}.pdf`);
        await writeFixture(stagedOutputPath, `new-${name}`);
        await writeFixture(outputPath, `old-${name}`);
        return { stagedOutputPath, outputPath, workspacePath };
      }),
    );
    const decisions: string[][] = [];

    await commitConversionOutputs(outputs, {
      resolveConflicts: async (conflicts: string[]) => {
        decisions.push(conflicts);
        return "keep-both";
      },
    });

    assert.strictEqual(decisions.length, 1);
    assert.deepStrictEqual(new Set(decisions[0]), new Set(outputs.map((item) => item.outputPath)));
  });

  test("上書きしない判断の場合はどの出力も反映しない", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-commit-test-"));
    const stagedOutputPath = path.join(workspacePath, ".latex-graphics-helper", "result.pdf");
    const outputPath = path.join(workspacePath, "sample.pdf");
    await writeFixture(stagedOutputPath, "new");
    await writeFixture(outputPath, "old");

    await assert.rejects(
      commitConversionOutputs([{ stagedOutputPath, outputPath, workspacePath }], {
        resolveConflicts: async () => "cancel",
      }),
      /cancelled/,
    );

    assert.strictEqual(await readFile(outputPath, "utf8"), "old");
  });

  test("上書き前に既存ファイルをバックアップする", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-commit-test-"));
    const stagedOutputPath = path.join(workspacePath, ".latex-graphics-helper", "result.pdf");
    const outputPath = path.join(workspacePath, "sample.pdf");
    await writeFixture(stagedOutputPath, "new");
    await writeFixture(outputPath, "old");

    const committed = await commitConversionOutputs(
      [{ stagedOutputPath, outputPath, workspacePath }],
      { resolveConflicts: async () => "overwrite" },
    );

    const previousFilePath = committed[0]?.previousFilePath;
    assert.ok(previousFilePath);
    assert.strictEqual(await readFile(previousFilePath, "utf8"), "old");
    assert.strictEqual(await readFile(outputPath, "utf8"), "new");
  });
});

async function writeFixture(filePath: string, contents: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents);
}
