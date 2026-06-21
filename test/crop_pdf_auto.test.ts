/* oxlint-disable vitest/expect-expect */

// Test target:
// - cropPdfFilesのPDF変換結果、workspace境界検証、キャンセル時の停止動作
//
// Mocked:
// - Ghostscriptのbbox出力
//
// Not tested:
// - Ghostscript本体の描画精度
// - VS Codeのcommand UI
// - withProgressの表示

import assert from "node:assert/strict";
import { constants } from "node:fs";
import { access, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { PDFDocument, rgb } from "pdf-lib";

import {
  cropPdfFiles,
  parseBoundingBoxes,
  type RunGhostscript,
} from "../src/operations/crop_pdf_auto.js";

suite("cropPdfFiles", () => {
  test("uses Ghostscript only once for bbox and crops all pages with pdf-lib", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-crop-test-"));
    const sourcePath = path.join(workspacePath, "source.pdf");
    const outputPath = path.join(workspacePath, "output", "source-crop.pdf");
    await writeFixturePdf(sourcePath);

    const calls: string[][] = [];
    const runGhostscript: RunGhostscript = async (_executable, args) => {
      calls.push(args);

      return {
        stdout: "",
        stderr: [
          "%%HiResBoundingBox: 10.000000 20.000000 110.000000 120.000000",
          "%%HiResBoundingBox: 40.000000 50.000000 240.000000 200.000000",
        ].join("\n"),
      };
    };

    await cropPdfFiles({
      jobs: [{ sourcePath, workspacePath, outputPath }],
      margin: 5,
      ghostscriptPath: "gs",
      runId: "run",
      runGhostscript,
    });

    assert.strictEqual(calls.length, 1);
    const copiedSourcePath = path.join(
      workspacePath,
      ".latex-graphics-helper",
      "crop-pdf",
      "run",
      "1-source",
      "source.pdf",
    );
    assert.deepStrictEqual(calls[0], [
      "-dSAFER",
      "-dBATCH",
      "-dNOPAUSE",
      "-sDEVICE=bbox",
      copiedSourcePath,
    ]);
    assert.ok(!calls[0]?.includes("-c"));
    assert.ok(!calls[0]?.some((argument) => argument.startsWith("--permit-file-read=")));
    assert.ok(!calls[0]?.includes("-sDEVICE=pdfwrite"));

    const outputDocument = await PDFDocument.load(await readFile(outputPath));
    assert.strictEqual(outputDocument.getPageCount(), 2);
    assert.deepStrictEqual(outputDocument.getPage(0).getMediaBox(), {
      x: 5,
      y: 15,
      width: 110,
      height: 110,
    });
    assert.deepStrictEqual(outputDocument.getPage(0).getCropBox(), {
      x: 5,
      y: 15,
      width: 110,
      height: 110,
    });
    assert.deepStrictEqual(outputDocument.getPage(1).getMediaBox(), {
      x: 35,
      y: 45,
      width: 210,
      height: 160,
    });

    const workDirectory = path.join(
      workspacePath,
      ".latex-graphics-helper",
      "crop-pdf",
      "run",
      "1-source",
    );
    await access(path.join(workDirectory, "source.pdf"));
    await access(path.join(workDirectory, "result.pdf"));
    await assert.rejects(access(path.join(workDirectory, "pages"), constants.F_OK));
  });

  test("keeps the original MediaBox for a blank page", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-crop-test-"));
    const sourcePath = path.join(workspacePath, "blank.pdf");
    const outputPath = path.join(workspacePath, "blank-crop.pdf");
    const document = await PDFDocument.create();
    document.addPage([320, 180]);
    await writeFile(sourcePath, await document.save());

    await cropPdfFiles({
      jobs: [{ sourcePath, workspacePath, outputPath }],
      margin: 20,
      ghostscriptPath: "gs",
      runGhostscript: async () => ({
        stdout: "",
        stderr: "%%HiResBoundingBox: 0.000000 0.000000 0.000000 0.000000\n",
      }),
    });

    const outputDocument = await PDFDocument.load(await readFile(outputPath));
    assert.deepStrictEqual(outputDocument.getPage(0).getMediaBox(), {
      x: 0,
      y: 0,
      width: 320,
      height: 180,
    });
  });

  test("limits concurrent PDF conversions with p-limit", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-crop-test-"));
    const jobs = await Promise.all(
      ["first", "second", "third", "fourth"].map(async (name) => {
        const sourcePath = path.join(workspacePath, `${name}.pdf`);
        await writeSinglePagePdf(sourcePath);

        return {
          sourcePath,
          workspacePath,
          outputPath: path.join(workspacePath, "output", `${name}.pdf`),
        };
      }),
    );

    let active = 0;
    let maximumActive = 0;
    const runGhostscript: RunGhostscript = async () => {
      active++;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 20));
      active--;

      return {
        stdout: "",
        stderr: "%%HiResBoundingBox: 10 10 90 90\n",
      };
    };

    await cropPdfFiles({
      jobs,
      margin: 0,
      ghostscriptPath: "gs",
      runGhostscript,
    });

    assert.strictEqual(maximumActive, 2);
  });

  test("does not overwrite an existing output", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-crop-test-"));
    const sourcePath = path.join(workspacePath, "source.pdf");
    const outputPath = path.join(workspacePath, "source-crop.pdf");
    await writeSinglePagePdf(sourcePath);
    await writeFile(outputPath, "existing");

    await assert.rejects(
      cropPdfFiles({
        jobs: [{ sourcePath, workspacePath, outputPath }],
        margin: 0,
        ghostscriptPath: "gs",
        runGhostscript: async () => {
          throw new Error("Ghostscript should not run.");
        },
      }),
      /Output file already exists/,
    );

    assert.strictEqual(await readFile(outputPath, "utf8"), "existing");
  });

  test("rejects an input file outside its declared workspace before running Ghostscript", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-workspace-"));
    const outsideDirectory = await mkdtemp(path.join(os.tmpdir(), "lgh-outside-"));
    const sourcePath = path.join(outsideDirectory, "source.pdf");
    const outputPath = path.join(workspacePath, "source-crop.pdf");
    await writeSinglePagePdf(sourcePath);

    let ghostscriptCalled = false;

    await assert.rejects(
      cropPdfFiles({
        jobs: [{ sourcePath, workspacePath, outputPath }],
        margin: 0,
        ghostscriptPath: "gs",
        runGhostscript: async () => {
          ghostscriptCalled = true;
          return { stdout: "", stderr: "%%HiResBoundingBox: 10 10 90 90\n" };
        },
      }),
      /outside the workspace/,
    );

    assert.strictEqual(ghostscriptCalled, false);
  });

  test("rejects an output path outside the workspace before running Ghostscript", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-workspace-"));
    const outsideDirectory = await mkdtemp(path.join(os.tmpdir(), "lgh-outside-"));
    const sourcePath = path.join(workspacePath, "source.pdf");
    const outputPath = path.join(outsideDirectory, "source-crop.pdf");
    await writeSinglePagePdf(sourcePath);

    let ghostscriptCalled = false;

    await assert.rejects(
      cropPdfFiles({
        jobs: [{ sourcePath, workspacePath, outputPath }],
        margin: 0,
        ghostscriptPath: "/outside/workspace/gs",
        runGhostscript: async () => {
          ghostscriptCalled = true;
          return { stdout: "", stderr: "%%HiResBoundingBox: 10 10 90 90\n" };
        },
      }),
      /outside the workspace/,
    );

    assert.strictEqual(ghostscriptCalled, false);
  });

  test("does not start Ghostscript when already cancelled", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-crop-test-"));
    const sourcePath = path.join(workspacePath, "source.pdf");
    const outputPath = path.join(workspacePath, "source-crop.pdf");
    const abortController = new AbortController();
    await writeSinglePagePdf(sourcePath);
    abortController.abort();

    let ghostscriptCalled = false;

    await assert.rejects(
      cropPdfFiles({
        jobs: [{ sourcePath, workspacePath, outputPath }],
        margin: 0,
        ghostscriptPath: "gs",
        signal: abortController.signal,
        runGhostscript: async () => {
          ghostscriptCalled = true;
          return { stdout: "", stderr: "%%HiResBoundingBox: 10 10 90 90\n" };
        },
      }),
      { name: "AbortError" },
    );

    assert.strictEqual(ghostscriptCalled, false);
    await assert.rejects(access(outputPath));
  });

  test("passes cancellation to a running Ghostscript operation", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-crop-test-"));
    const sourcePath = path.join(workspacePath, "source.pdf");
    const outputPath = path.join(workspacePath, "source-crop.pdf");
    const abortController = new AbortController();
    await writeSinglePagePdf(sourcePath);

    let receivedSignal: AbortSignal | undefined;
    const runGhostscript: RunGhostscript = async (_executable, _args, signal) => {
      receivedSignal = signal;
      abortController.abort();
      signal?.throwIfAborted();

      throw new Error("Ghostscript cancellation was not propagated.");
    };

    await assert.rejects(
      cropPdfFiles({
        jobs: [{ sourcePath, workspacePath, outputPath }],
        margin: 0,
        ghostscriptPath: "gs",
        signal: abortController.signal,
        runGhostscript,
      }),
      { name: "AbortError" },
    );

    assert.strictEqual(receivedSignal, abortController.signal);
    await assert.rejects(access(outputPath));
  });

  test("does not start queued conversions after cancellation", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-crop-test-"));
    const abortController = new AbortController();
    const jobs = await Promise.all(
      ["first", "second", "third", "fourth"].map(async (name) => {
        const sourcePath = path.join(workspacePath, `${name}.pdf`);
        await writeSinglePagePdf(sourcePath);

        return {
          sourcePath,
          workspacePath,
          outputPath: path.join(workspacePath, "output", `${name}.pdf`),
        };
      }),
    );

    let startedConversions = 0;
    const runGhostscript: RunGhostscript = async (_executable, _args, signal) => {
      startedConversions++;

      if (startedConversions === 2) {
        abortController.abort();
      }

      signal?.throwIfAborted();
      return { stdout: "", stderr: "%%HiResBoundingBox: 10 10 90 90\n" };
    };

    await assert.rejects(
      cropPdfFiles({
        jobs,
        margin: 0,
        ghostscriptPath: "gs",
        signal: abortController.signal,
        runGhostscript,
      }),
      { name: "AbortError" },
    );
    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.strictEqual(startedConversions, 2);

    for (const job of jobs) {
      await assert.rejects(access(job.outputPath));
    }
  });
});

suite("parseBoundingBoxes", () => {
  test("parses Ghostscript HiResBoundingBox output", () => {
    assert.deepStrictEqual(parseBoundingBoxes("%%HiResBoundingBox: -1.5 2 30.25 40\n"), [
      { left: -1.5, bottom: 2, right: 30.25, top: 40 },
    ]);
  });
});

async function writeFixturePdf(filePath: string): Promise<void> {
  const document = await PDFDocument.create();
  const firstPage = document.addPage([300, 200]);
  firstPage.drawRectangle({ x: 10, y: 20, width: 100, height: 100, color: rgb(1, 0, 0) });
  const secondPage = document.addPage([400, 300]);
  secondPage.drawRectangle({ x: 40, y: 50, width: 200, height: 150, color: rgb(0, 0, 1) });
  await writeFile(filePath, await document.save());
}

async function writeSinglePagePdf(filePath: string): Promise<void> {
  const document = await PDFDocument.create();
  const page = document.addPage([100, 100]);
  page.drawRectangle({ x: 10, y: 10, width: 80, height: 80, color: rgb(1, 0, 0) });
  await writeFile(filePath, await document.save());
}
