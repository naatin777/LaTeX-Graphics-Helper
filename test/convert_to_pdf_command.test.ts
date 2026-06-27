/* oxlint-disable vitest/expect-expect */

// Test target:
// - latex-graphics-helper.convertToPdf commandが登録されること
// - PNGをPDFに変換できること
// - JPEG、WebP、AVIFをPDFに変換できること
// - 複数PNGを1回のコマンドでPDFへ変換できること
// - 非対応入力が含まれる場合、変換全体を開始しないこと
// - 入力形式と出力形式が同じ場合、変換全体を開始しないこと
// - 出力PDFが1ページであること
// - PDFページサイズが入力画像のpixel幅・高さと同じ数値のpointになること
//
// Mocked:
// - なし。VS Code command、実PNG fixture、実ファイル出力を使用する。
//
// Not tested:
// - SVG、Draw.ioからPDFへの変換詳細
// - 画像を1つのPDFへ結合する機能
// - context menuの画面上の表示
// - Safe Modeダイアログの画面表示
// - VS Codeのprogress notificationの画面表示
// - cancellation tokenのUI操作

import assert from "node:assert/strict";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import * as vscode from "vscode";

import {
  clearNotificationsAfterDelay,
  runCommandAndClearNotifications,
} from "./helpers/vscode_command.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixturePngPath = path.join(testDirectory, "..", "..", "test", "fixtures", "test.png");
const CONVERT_TO_PDF_COMMAND = "latex-graphics-helper.convertToPdf";
const generatedImageWidth = 17;
const generatedImageHeight = 13;

const imageVariants = [
  { basename: "source-jpeg", extension: "jpeg", format: "jpeg" },
  { basename: "source-webp", extension: "webp", format: "webp" },
  { basename: "source-avif", extension: "avif", format: "avif" },
] as const;

suite("convertToPdf command", () => {
  test("command is registered", async () => {
    const commands = await vscode.commands.getCommands(true);

    assert.ok(commands.includes(CONVERT_TO_PDF_COMMAND));
  });

  test("converts a PNG to a one-page PDF with the image pixel size as page points", async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const sourcePath = path.join(temporaryDirectory, "source.png");
      const outputPath = path.join(temporaryDirectory, "source.pdf");
      await copyFile(fixturePngPath, sourcePath);

      const commandExecution = vscode.commands.executeCommand(
        CONVERT_TO_PDF_COMMAND,
        vscode.Uri.file(sourcePath),
      );
      await runCommandAndClearNotifications(commandExecution, () => waitForFile(outputPath));

      await assertPdfPageSizeMatchesImage(outputPath, sourcePath);
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  test("converts JPEG, WebP, and AVIF files to one-page PDFs with image pixel sizes as page points", async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const sourcePaths = await Promise.all(
        imageVariants.map(async (variant) => {
          const sourcePath = path.join(
            temporaryDirectory,
            `${variant.basename}.${variant.extension}`,
          );
          await writeTestImage(sourcePath, variant.format);
          return sourcePath;
        }),
      );

      const commandExecution = vscode.commands.executeCommand(
        CONVERT_TO_PDF_COMMAND,
        vscode.Uri.file(sourcePaths[0]!),
        sourcePaths.map((sourcePath) => vscode.Uri.file(sourcePath)),
      );
      await runCommandAndClearNotifications(commandExecution, async () => {
        await Promise.all(
          sourcePaths.map((sourcePath) => waitForFile(replaceExtension(sourcePath, ".pdf"))),
        );
      });

      await Promise.all(
        sourcePaths.map((sourcePath) =>
          assertPdfPageSizeMatchesImage(replaceExtension(sourcePath, ".pdf"), sourcePath),
        ),
      );
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  test("converts multiple PNG files as one batch", async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const firstSourcePath = path.join(temporaryDirectory, "first.png");
      const secondSourcePath = path.join(temporaryDirectory, "second.png");
      await copyFile(fixturePngPath, firstSourcePath);
      await copyFile(fixturePngPath, secondSourcePath);

      const commandExecution = vscode.commands.executeCommand(
        CONVERT_TO_PDF_COMMAND,
        vscode.Uri.file(firstSourcePath),
        [vscode.Uri.file(firstSourcePath), vscode.Uri.file(secondSourcePath)],
      );
      await runCommandAndClearNotifications(commandExecution, async () => {
        await waitForFile(path.join(temporaryDirectory, "first.pdf"));
        await waitForFile(path.join(temporaryDirectory, "second.pdf"));
      });

      await assertPdfPageSizeMatchesImage(
        path.join(temporaryDirectory, "first.pdf"),
        firstSourcePath,
      );
      await assertPdfPageSizeMatchesImage(
        path.join(temporaryDirectory, "second.pdf"),
        secondSourcePath,
      );
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  test("does not convert any file when an unsupported input is included", async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const pngPath = path.join(temporaryDirectory, "source.png");
      const unsupportedPath = path.join(temporaryDirectory, "source.txt");
      await copyFile(fixturePngPath, pngPath);
      await writeFile(unsupportedPath, "not an image");

      const commandExecution = vscode.commands.executeCommand(
        CONVERT_TO_PDF_COMMAND,
        vscode.Uri.file(pngPath),
        [vscode.Uri.file(pngPath), vscode.Uri.file(unsupportedPath)],
      );
      await runCommandAndClearNotifications(commandExecution, clearNotificationsAfterDelay);

      await assertFileDoesNotExist(path.join(temporaryDirectory, "source.pdf"));
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  test("does not convert a PDF to PDF", async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const pdfPath = path.join(temporaryDirectory, "source.pdf");
      const pdf = await PDFDocument.create();
      pdf.addPage([120, 80]);
      await writeFile(pdfPath, await pdf.save());

      const commandExecution = vscode.commands.executeCommand(
        CONVERT_TO_PDF_COMMAND,
        vscode.Uri.file(pdfPath),
      );
      await runCommandAndClearNotifications(commandExecution, clearNotificationsAfterDelay);
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
});

async function createTemporaryWorkspaceDirectory(): Promise<string> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(workspaceFolder);

  const temporaryDirectory = await mkdtemp(
    path.join(workspaceFolder.uri.fsPath, "lgh-convert-to-pdf-"),
  );
  await mkdir(temporaryDirectory, { recursive: true });
  return temporaryDirectory;
}

async function assertPdfPageSizeMatchesImage(pdfPath: string, imagePath: string): Promise<void> {
  const imageMetadata = await sharp(imagePath).metadata();
  assert.ok(imageMetadata.width);
  assert.ok(imageMetadata.height);

  const pdf = await PDFDocument.load(await readFile(pdfPath));
  assert.strictEqual(pdf.getPageCount(), 1);

  const page = pdf.getPage(0);
  const { width, height } = page.getSize();
  assertApproximatelyEqual(width, imageMetadata.width, 0.01);
  assertApproximatelyEqual(height, imageMetadata.height, 0.01);
}

async function writeTestImage(
  filePath: string,
  format: (typeof imageVariants)[number]["format"],
): Promise<void> {
  await sharp({
    create: {
      width: generatedImageWidth,
      height: generatedImageHeight,
      channels: 4,
      background: { r: 40, g: 80, b: 120, alpha: 1 },
    },
  })
    .toFormat(format)
    .toFile(filePath);
}

function replaceExtension(filePath: string, extension: string): string {
  return path.join(
    path.dirname(filePath),
    `${path.basename(filePath, path.extname(filePath))}${extension}`,
  );
}

function assertApproximatelyEqual(actual: number, expected: number, tolerance: number): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

async function assertFileDoesNotExist(filePath: string): Promise<void> {
  await assert.rejects(readFile(filePath), (error) => {
    return error instanceof Error && "code" in error && error.code === "ENOENT";
  });
}

async function waitForFile(filePath: string): Promise<void> {
  const timeoutAt = Date.now() + 10_000;

  while (Date.now() < timeoutAt) {
    try {
      await access(filePath);
      return;
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
        throw error;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error(`Timed out waiting for file: ${filePath}`);
}
