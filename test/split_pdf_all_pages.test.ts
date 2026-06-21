/* oxlint-disable vitest/expect-expect */

// Test target:
// - 1件以上のPDFを1ページごとに分割し、全成功後に出力すること
// - 既存出力、出力重複、キャンセル時に出力を反映しないこと
//
// Mocked:
// - なし。pdf-libと実ファイルを使用する
//
// Not tested:
// - VS CodeのwithProgress UI
// - commandからのURI選択
// - PDF描画内容の見た目

import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { PDFDocument } from "pdf-lib";

import { splitPdfAllPages } from "../src/operations/split_pdf_all_pages.js";

suite("splitPdfAllPages", () => {
  test("splits every page with one-based page numbers and keeps staging files", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-split-test-"));
    const sourcePath = path.join(workspacePath, "source.pdf");
    const outputDirectory = path.join(workspacePath, "source");
    await writePdf(sourcePath, 3);

    await splitPdfAllPages({
      jobs: [
        {
          sourcePath,
          workspacePath,
          outputPathForPage: (page: number) => path.join(outputDirectory, `${page}.pdf`),
        },
      ],
      runId: "run",
    });

    for (const page of [1, 2, 3]) {
      const output = await PDFDocument.load(
        await readFile(path.join(outputDirectory, `${page}.pdf`)),
      );
      assert.strictEqual(output.getPageCount(), 1);
    }

    const stagingDirectory = path.join(
      workspacePath,
      ".latex-graphics-helper",
      "split-pdf",
      "run",
      "1-source",
    );
    await assert.doesNotReject(access(path.join(stagingDirectory, "source.pdf")));
    await assert.doesNotReject(access(path.join(stagingDirectory, "pages", "1.pdf")));
    await assert.doesNotReject(access(path.join(stagingDirectory, "pages", "2.pdf")));
    await assert.doesNotReject(access(path.join(stagingDirectory, "pages", "3.pdf")));
  });

  test("splits multiple PDFs after all inputs succeed", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-split-test-"));
    const firstSourcePath = path.join(workspacePath, "first.pdf");
    const secondSourcePath = path.join(workspacePath, "second.pdf");
    await writePdf(firstSourcePath, 2);
    await writePdf(secondSourcePath, 1);

    await splitPdfAllPages({
      jobs: [firstSourcePath, secondSourcePath].map((sourcePath) => ({
        sourcePath,
        workspacePath,
        outputPathForPage: (page: number) =>
          path.join(workspacePath, path.basename(sourcePath, ".pdf"), `${page}.pdf`),
      })),
    });

    await assert.doesNotReject(access(path.join(workspacePath, "first", "1.pdf")));
    await assert.doesNotReject(access(path.join(workspacePath, "first", "2.pdf")));
    await assert.doesNotReject(access(path.join(workspacePath, "second", "1.pdf")));
  });

  test("does not create any output when an output already exists", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-split-test-"));
    const sourcePath = path.join(workspacePath, "source.pdf");
    const firstOutputPath = path.join(workspacePath, "source", "1.pdf");
    const secondOutputPath = path.join(workspacePath, "source", "2.pdf");
    await writePdf(sourcePath, 2);
    await mkdir(path.dirname(secondOutputPath), { recursive: true });
    await writeFile(secondOutputPath, "existing");

    await assert.rejects(
      splitPdfAllPages({
        jobs: [
          {
            sourcePath,
            workspacePath,
            outputPathForPage: (page: number) => (page === 1 ? firstOutputPath : secondOutputPath),
          },
        ],
      }),
      /Output file already exists/,
    );

    await assert.rejects(access(firstOutputPath));
    assert.strictEqual(await readFile(secondOutputPath, "utf8"), "existing");
  });

  test("does not create output when page paths collide", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-split-test-"));
    const sourcePath = path.join(workspacePath, "source.pdf");
    const outputPath = path.join(workspacePath, "same.pdf");
    await writePdf(sourcePath, 2);

    await assert.rejects(
      splitPdfAllPages({
        jobs: [
          {
            sourcePath,
            workspacePath,
            outputPathForPage: () => outputPath,
          },
        ],
      }),
      /same output/,
    );

    await assert.rejects(access(outputPath));
  });

  test("does not create output when cancelled", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-split-test-"));
    const sourcePath = path.join(workspacePath, "source.pdf");
    const outputPath = path.join(workspacePath, "source", "1.pdf");
    const abortController = new AbortController();
    await writePdf(sourcePath, 1);
    abortController.abort();

    await assert.rejects(
      splitPdfAllPages({
        jobs: [
          {
            sourcePath,
            workspacePath,
            outputPathForPage: () => outputPath,
          },
        ],
        signal: abortController.signal,
      }),
      { name: "AbortError" },
    );

    await assert.rejects(access(outputPath));
  });
});

async function writePdf(filePath: string, pageCount: number): Promise<void> {
  const document = await PDFDocument.create();

  for (let page = 1; page <= pageCount; page++) {
    document.addPage([100 + page, 200 + page]);
  }

  await writeFile(filePath, await document.save());
}
