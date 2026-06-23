/* oxlint-disable vitest/expect-expect */

// Test target:
// - PNGをPDFに変換する機能
//
// Mocked:
// - なし。実PNGファイルと実ファイル出力を使用する
//
// Not tested:
// - VS Codeのcommand UI
// - 他の画像フォーマット（JPEG、WebP、Avif、SVG）の変換

import assert from "node:assert/strict";
import { copyFile, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { convertPngToPdf } from "../src/operations/convert_png_to_pdf.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

suite("convertPngToPdf", () => {
  test("converts PNG to PDF", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-png-test-"));
    const sourcePath = path.join(workspacePath, "source.png");
    const outputPath = path.join(workspacePath, "output.pdf");

    // Copy fixture PNG file
    await copyFile(path.join(__dirname, "..", "..", "test", "fixtures", "test.png"), sourcePath);

    await convertPngToPdf({
      sourcePath,
      outputPath,
      workspacePath,
    });

    // Verify output PDF exists
    const { PDFDocument } = await import("pdf-lib");
    const pdf = await PDFDocument.load(
      await import("node:fs/promises").then((fs) => fs.readFile(outputPath)),
    );
    assert.strictEqual(pdf.getPageCount(), 1);
  });
});
