/* oxlint-disable vitest/expect-expect */

// Test target:
// - 複数PNGをすべてステージングしてから1回で出力先へ反映すること
// - Safe Modeの両方残す・上書きしない・上書きするがバッチ全体へ適用されること
// - 変換失敗とキャンセル時に指定出力先へ何も反映しないこと
// - 上書き後の直前変換取消で元ファイルを復元すること
//
// Mocked:
// - Safe Modeの競合判断
//
// Not tested:
// - VS Codeのダイアログとstatus barの描画
// - VS CodeのwithProgress表示
// - 他の画像形式

import assert from "node:assert/strict";
import { access, copyFile, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PDFDocument } from "pdf-lib";

import {
  convertPngToPdfFiles,
  type ConvertPngToPdfJob,
} from "../src/operations/convert_png_to_pdf.js";
import {
  createConversionUndoRecord,
  undoConversionOutputs,
} from "../src/operations/undo_last_conversion.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(testDirectory, "..", "..", "test", "fixtures", "test.png");

suite("PNG Safe Mode", () => {
  test("stages every conversion before reflecting all outputs", async () => {
    const { workspacePath, jobs } = await createJobs(["first", "second"]);

    const outputs = await convertPngToPdfFiles({
      jobs,
      runId: "batch-success",
      resolveOutputConflicts: async () => "overwrite",
    });

    assert.strictEqual(outputs.length, 2);

    for (const job of jobs) {
      const pdf = await PDFDocument.load(await readFile(job.outputPath));
      assert.strictEqual(pdf.getPageCount(), 1);
    }

    const stagedRoot = path.join(
      workspacePath,
      ".latex-graphics-helper",
      "convert-png-to-pdf",
      "batch-success",
    );
    assert.deepStrictEqual(new Set(await readdir(stagedRoot)), new Set(["1", "2"]));
    await assert.doesNotReject(access(path.join(stagedRoot, "1", "result.pdf")));
    await assert.doesNotReject(access(path.join(stagedRoot, "2", "result.pdf")));
  });

  test("uses one conflict decision for the whole batch and keeps both files", async () => {
    const { workspacePath, jobs } = await createJobs(["first", "second"]);
    await writeFile(jobs[0]!.outputPath, "old-first");
    await writeFile(jobs[1]!.outputPath, "old-second");
    await writeFile(path.join(workspacePath, "first-1.pdf"), "reserved");
    const decisions: string[][] = [];

    const outputs = await convertPngToPdfFiles({
      jobs,
      resolveOutputConflicts: async (conflicts) => {
        decisions.push(conflicts);
        return "keep-both";
      },
    });

    assert.strictEqual(decisions.length, 1);
    assert.deepStrictEqual(new Set(decisions[0]), new Set(jobs.map((job) => job.outputPath)));
    assert.deepStrictEqual(
      new Set(outputs.map((output) => output.outputPath)),
      new Set([path.join(workspacePath, "first-2.pdf"), path.join(workspacePath, "second-1.pdf")]),
    );
    assert.strictEqual(await readFile(jobs[0]!.outputPath, "utf8"), "old-first");
    assert.strictEqual(await readFile(jobs[1]!.outputPath, "utf8"), "old-second");
  });

  test("does not reflect any output when overwrite is declined", async () => {
    const { jobs } = await createJobs(["first", "second"]);
    await writeFile(jobs[0]!.outputPath, "old-first");

    await assert.rejects(
      convertPngToPdfFiles({
        jobs,
        resolveOutputConflicts: async () => "cancel",
      }),
      /cancelled/,
    );

    assert.strictEqual(await readFile(jobs[0]!.outputPath, "utf8"), "old-first");
    await assert.rejects(access(jobs[1]!.outputPath));
  });

  test("does not reflect earlier jobs when a later PNG conversion fails", async () => {
    const { workspacePath, jobs } = await createJobs(["first", "second"]);
    const invalidSourcePath = path.join(workspacePath, "invalid.png");
    await writeFile(invalidSourcePath, "not a PNG");
    jobs[1] = {
      ...jobs[1]!,
      sourcePath: invalidSourcePath,
    };

    await assert.rejects(
      convertPngToPdfFiles({
        jobs,
        resolveOutputConflicts: async () => "overwrite",
      }),
    );

    await Promise.all(jobs.map((job) => assert.rejects(access(job.outputPath))));
  });

  test("backs up overwritten files and restores them through the undo operation", async () => {
    const { jobs } = await createJobs(["first", "second"]);
    await writeFile(jobs[0]!.outputPath, "old-first");
    await writeFile(jobs[1]!.outputPath, "old-second");

    const outputs = await convertPngToPdfFiles({
      jobs,
      resolveOutputConflicts: async () => "overwrite",
    });
    const undoRecord = await createConversionUndoRecord(outputs);

    assert.ok(outputs.every((output) => output.previousFilePath));
    await undoConversionOutputs(undoRecord);

    assert.strictEqual(await readFile(jobs[0]!.outputPath, "utf8"), "old-first");
    assert.strictEqual(await readFile(jobs[1]!.outputPath, "utf8"), "old-second");
  });

  test("does not reflect output when already cancelled", async () => {
    const { jobs } = await createJobs(["first", "second"]);
    const abortController = new AbortController();
    abortController.abort();

    await assert.rejects(
      convertPngToPdfFiles({
        jobs,
        signal: abortController.signal,
        resolveOutputConflicts: async () => "overwrite",
      }),
      { name: "AbortError" },
    );

    await Promise.all(jobs.map((job) => assert.rejects(access(job.outputPath))));
  });
});

async function createJobs(names: string[]): Promise<{
  workspacePath: string;
  jobs: ConvertPngToPdfJob[];
}> {
  const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-png-safe-test-"));
  const jobs = await Promise.all(
    names.map(async (name) => {
      const sourcePath = path.join(workspacePath, `${name}.png`);
      await copyFile(fixturePath, sourcePath);

      return {
        sourcePath,
        outputPath: path.join(workspacePath, `${name}.pdf`),
        workspacePath,
      };
    }),
  );

  return { workspacePath, jobs };
}
