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
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  commitConversionOutputs,
  CommitRollbackError,
  OperationCancelledError,
} from "../src/operations/commit_conversion_outputs.js";

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

  test("1件目の成功後に2件目のcopyが失敗すると両方を元へ戻す", async () => {
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
    let copyCount = 0;

    await assert.rejects(
      commitConversionOutputs(outputs, {
        resolveConflicts: async () => "overwrite",
        copyFile: async (source, destination, flags) => {
          copyCount += 1;
          await copyFile(source, destination, flags);
          if (copyCount === 4) {
            throw new Error("injected second output copy failure");
          }
        },
      }),
      /injected second output copy failure/,
    );

    assert.strictEqual(await readFile(outputs[0]?.outputPath ?? "", "utf8"), "old-first");
    assert.strictEqual(await readFile(outputs[1]?.outputPath ?? "", "utf8"), "old-second");
  });

  test("overwrite中の現在出力のcopy失敗でもbackupから復元する", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-commit-test-"));
    const stagedOutputPath = path.join(workspacePath, ".latex-graphics-helper", "result.pdf");
    const outputPath = path.join(workspacePath, "sample.pdf");
    await writeFixture(stagedOutputPath, "new");
    await writeFixture(outputPath, "old");

    await assert.rejects(
      commitConversionOutputs([{ stagedOutputPath, outputPath, workspacePath }], {
        resolveConflicts: async () => "overwrite",
        copyFile: async (source, destination, flags) => {
          await copyFile(source, destination, flags);
          if (destination === outputPath) {
            throw new Error("injected current output copy failure");
          }
        },
      }),
      /injected current output copy failure/,
    );

    assert.strictEqual(await readFile(outputPath, "utf8"), "old");
  });

  test("新規出力のcopy失敗では不完全ファイルを残さない", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-commit-test-"));
    const stagingRootPath = path.join(workspacePath, ".latex-graphics-helper", "run");
    const stagedOutputPath = path.join(stagingRootPath, "result.pdf");
    const outputPath = path.join(workspacePath, "new.pdf");
    await writeFixture(stagedOutputPath, "new");

    await assert.rejects(
      commitConversionOutputs([{ stagedOutputPath, outputPath, workspacePath, stagingRootPath }], {
        copyFile: async (source, destination, flags) => {
          await copyFile(source, destination, flags);
          if (destination === outputPath) {
            throw new Error("injected new output copy failure");
          }
        },
      }),
      /injected new output copy failure/,
    );

    await assert.rejects(readFile(outputPath));
  });

  test("rollback失敗は元エラーと対象pathを保持しOutput Channelへ記録する", async () => {
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
    const lines: string[] = [];
    let copyCount = 0;

    await assert.rejects(
      commitConversionOutputs(outputs, {
        resolveConflicts: async () => "overwrite",
        operationName: "test-rollback",
        outputChannel: { appendLine: (line) => lines.push(line) },
        copyFile: async (source, destination, flags) => {
          copyCount += 1;
          if (copyCount === 5) {
            throw new Error("injected rollback failure");
          }
          await copyFile(source, destination, flags);
          if (copyCount === 4) {
            throw new Error("injected commit failure");
          }
        },
      }),
      (error: unknown) => {
        assert.ok(error instanceof CommitRollbackError);
        assert.match(error.originalError.message, /injected commit failure/);
        assert.strictEqual(error.rollbackErrors[0]?.outputPath, outputs[1]?.outputPath);
        return true;
      },
    );

    assert.ok(
      lines.some((line) => line.includes("rollback failed") && line.includes("second.pdf")),
    );
  });

  test("commit済み出力へのcancelでもrollbackする", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-commit-test-"));
    const stagedOutputPath = path.join(workspacePath, ".latex-graphics-helper", "result.pdf");
    const outputPath = path.join(workspacePath, "sample.pdf");
    const controller = new AbortController();
    await writeFixture(stagedOutputPath, "new");
    await writeFixture(outputPath, "old");
    let copyCount = 0;

    await assert.rejects(
      commitConversionOutputs([{ stagedOutputPath, outputPath, workspacePath }], {
        signal: controller.signal,
        resolveConflicts: async () => "overwrite",
        copyFile: async (source, destination, flags) => {
          copyCount += 1;
          await copyFile(source, destination, flags);
          if (copyCount === 2) {
            controller.abort();
          }
        },
      }),
      /aborted/,
    );

    assert.strictEqual(await readFile(outputPath, "utf8"), "old");
  });

  test("conflict判断後に変更された出力は上書きしない", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-commit-test-"));
    const stagedOutputPath = path.join(workspacePath, ".latex-graphics-helper", "result.pdf");
    const outputPath = path.join(workspacePath, "sample.pdf");
    await writeFixture(stagedOutputPath, "new");
    await writeFixture(outputPath, "old");

    await assert.rejects(
      commitConversionOutputs([{ stagedOutputPath, outputPath, workspacePath }], {
        resolveConflicts: async () => {
          await writeFile(outputPath, "changed while dialog was open");
          return "overwrite";
        },
      }),
      /changed before overwrite/,
    );

    assert.strictEqual(await readFile(outputPath, "utf8"), "changed while dialog was open");
  });

  test("rollbackは対象外のファイルを削除しない", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-commit-test-"));
    const stagedOutputPath = path.join(workspacePath, ".latex-graphics-helper", "result.pdf");
    const outputPath = path.join(workspacePath, "sample.pdf");
    const unrelatedPath = path.join(workspacePath, "unrelated.txt");
    await writeFixture(stagedOutputPath, "new");
    await writeFixture(unrelatedPath, "keep");

    await assert.rejects(
      commitConversionOutputs([{ stagedOutputPath, outputPath, workspacePath }], {
        copyFile: async (source, destination, flags) => {
          await copyFile(source, destination, flags);
          if (destination === outputPath) {
            throw new Error("injected failure");
          }
        },
      }),
      /injected failure/,
    );

    assert.strictEqual(await readFile(unrelatedPath, "utf8"), "keep");
    await rm(workspacePath, { recursive: true, force: true });
  });

  test("Safe Modeの取消はAbortErrorとして確認できる", () => {
    const error = new OperationCancelledError("Do Not Overwrite");

    assert.strictEqual(error.name, "AbortError");
    assert.match(error.message, /Do Not Overwrite/);
  });
});

async function writeFixture(filePath: string, contents: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents);
}
