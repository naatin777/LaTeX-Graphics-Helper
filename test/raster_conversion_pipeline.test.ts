/* oxlint-disable vitest/expect-expect */

import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runRasterConversionPipeline } from "../src/operations/raster_conversion_pipeline.js";

suite("raster共通pipeline", () => {
  test("staging・commit・cleanupを形式固有stage callbackと接続する", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-raster-pipeline-"));
    const outputPath = path.join(workspacePath, "result.png");
    const stagingRootPath = path.join(workspacePath, ".latex-graphics-helper", "fixture", "run");

    try {
      const outputs = await runRasterConversionPipeline({
        jobs: [{ workspacePath }],
        operationName: "fixture-raster",
        runId: "run",
        stage: async (_job, _index, runId) => {
          const stagedOutputPath = path.join(
            workspacePath,
            ".latex-graphics-helper",
            "fixture-raster",
            runId,
            "result.png",
          );
          await mkdir(path.dirname(stagedOutputPath), { recursive: true });
          await writeFile(stagedOutputPath, "raster result");
          return { stagedOutputPath, outputPath, workspacePath, stagingRootPath };
        },
      });

      assert.strictEqual(outputs[0]?.outputPath, outputPath);
      assert.strictEqual(await readFile(outputPath, "utf8"), "raster result");
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });
});
