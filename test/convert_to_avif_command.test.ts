/* oxlint-disable vitest/expect-expect */

// Test target:
// - latex-graphics-helper.convertToAvif commandが登録されること
// - PNGをAVIFへ変換できること
// - JPEG、WebPをAVIFへ変換できること
// - SVGをAVIFへ変換できること
// - PDFをページごとのAVIFへ変換できること
// - MermaidをAVIFへ変換できること
// - AVIFからAVIFへは変換しないこと
// - 出力AVIFが壊れておらず、幅と高さが0より大きいこと
//
// Not tested:
// - Draw.io → PDF → PNG → AVIFの実変換経路
//   - fake Draw.io CLIをcommand testで直接扱うとWindowsのexecFile差で不安定になりやすい。
//   - 必要になったらrunnerを注入できるoperation testとして固定する。
// - PDF / Draw.io / MermaidからAVIFへの変換ではPNGを中間形式に使うこと
//   - command testでは出力AVIFの読み取り可能性を確認し、中間形式の詳細はoperation testで扱う。
// - 画像内容のpixel完全一致
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
import sinon from "sinon";
import * as vscode from "vscode";

import { runCommandAndClearNotificationsUntilDone } from "./helpers/vscode_command.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixturePngPath = path.join(testDirectory, "..", "..", "test", "fixtures", "test.png");
const CONVERT_TO_AVIF_COMMAND = "latex-graphics-helper.convertToAvif";
const generatedSvgWidth = 31;
const generatedSvgHeight = 19;

suite("AVIFに変換コマンド", () => {
  let sandbox: sinon.SinonSandbox;

  setup(async () => {
    sandbox = sinon.createSandbox();
    sandbox.stub(vscode.window, "showInformationMessage").resolves(undefined);
    sandbox.stub(vscode.window, "showErrorMessage").resolves(undefined);
    await vscode.workspace
      .getConfiguration("latex-graphics-helper")
      .update("convertToAvif.effort", 0, vscode.ConfigurationTarget.Workspace);
  });

  teardown(async () => {
    await vscode.workspace
      .getConfiguration("latex-graphics-helper")
      .update("convertToAvif.effort", undefined, vscode.ConfigurationTarget.Workspace);
    sandbox.restore();
  });

  test("コマンドが登録されている", async () => {
    const commands = await vscode.commands.getCommands(true);

    assert.ok(commands.includes(CONVERT_TO_AVIF_COMMAND));
  });

  test("PNG、JPEG、WebP、SVG、PDFを1つのbatchでAVIFへ変換する", async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const pngPath = path.join(temporaryDirectory, "source-png.png");
      const jpegPath = path.join(temporaryDirectory, "source-jpeg.jpeg");
      const webpPath = path.join(temporaryDirectory, "source-webp.webp");
      const svgPath = path.join(temporaryDirectory, "source-svg.svg");
      const pdfPath = path.join(temporaryDirectory, "source-document.pdf");
      await Promise.all([
        copyFile(fixturePngPath, pngPath),
        writeImageFixture(jpegPath, "jpeg"),
        writeImageFixture(webpPath, "webp"),
        writeTestSvg(svgPath, generatedSvgWidth, generatedSvgHeight),
        writeTwoPagePdf(pdfPath),
      ]);
      const sourcePaths = [pngPath, jpegPath, webpPath, svgPath, pdfPath];

      const commandExecution = vscode.commands.executeCommand(
        CONVERT_TO_AVIF_COMMAND,
        vscode.Uri.file(sourcePaths[0]!),
        sourcePaths.map((sourcePath) => vscode.Uri.file(sourcePath)),
      );
      await runCommandAndClearNotificationsUntilDone(commandExecution);

      await Promise.all(
        [pngPath, jpegPath, webpPath, svgPath].map((sourcePath) =>
          assertReadableAvif(replaceExtension(sourcePath, ".avif")),
        ),
      );
      await assertReadableAvif(path.join(temporaryDirectory, "source-document-1.avif"));
      await assertReadableAvif(path.join(temporaryDirectory, "source-document-2.avif"));
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test(".mmdと.mermaidを順番に読み取り可能なAVIFへ変換する", async () => {
    await assertMermaidFileConvertsToAvif("source.mmd");
    await assertMermaidFileConvertsToAvif("source.mermaid");
  });

  test("AVIFからAVIFへは変換しない", async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const sourcePath = path.join(temporaryDirectory, "source.avif");
      await writeImageFixture(sourcePath, "avif");

      await vscode.commands.executeCommand(CONVERT_TO_AVIF_COMMAND, vscode.Uri.file(sourcePath));

      await assertFileDoesNotExist(path.join(temporaryDirectory, "source-1.avif"));
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });
});

async function assertMermaidFileConvertsToAvif(fileName: string): Promise<void> {
  const temporaryDirectory = await createTemporaryWorkspaceDirectory();

  try {
    const sourcePath = path.join(temporaryDirectory, fileName);
    await writeMermaidFixture(sourcePath);

    const commandExecution = vscode.commands.executeCommand(
      CONVERT_TO_AVIF_COMMAND,
      vscode.Uri.file(sourcePath),
    );
    await runCommandAndClearNotificationsUntilDone(commandExecution);

    await assertReadableAvif(replaceExtension(sourcePath, ".avif"));
  } finally {
    await removeTemporaryDirectory(temporaryDirectory);
  }
}

async function createTemporaryWorkspaceDirectory(): Promise<string> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(workspaceFolder);

  const temporaryDirectory = await mkdtemp(
    path.join(workspaceFolder.uri.fsPath, "lgh-convert-to-avif-"),
  );
  await mkdir(temporaryDirectory, { recursive: true });
  return temporaryDirectory;
}

async function removeTemporaryDirectory(directoryPath: string): Promise<void> {
  await rm(directoryPath, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 100,
  });
}

async function writeMermaidFixture(filePath: string): Promise<void> {
  await writeFile(
    filePath,
    ["flowchart LR", "  A[Mermaid Alpha] --> B[Mermaid Beta]", ""].join("\n"),
  );
}

async function writeTestSvg(filePath: string, width: number, height: number): Promise<void> {
  await writeFile(
    filePath,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#285078"/></svg>`,
  );
}

async function writeTwoPagePdf(filePath: string): Promise<void> {
  const document = await PDFDocument.create();
  document.addPage([72, 36]);
  document.addPage([36, 72]);
  await writeFile(filePath, await document.save());
}

async function writeImageFixture(filePath: string, extension: string): Promise<void> {
  const image = sharp(await readFile(fixturePngPath));

  if (extension === "jpeg") {
    await image.jpeg().toFile(filePath);
    return;
  }

  if (extension === "avif") {
    await image.avif({ effort: 0 }).toFile(filePath);
    return;
  }

  if (extension === "webp") {
    await image.webp({ effort: 0 }).toFile(filePath);
    return;
  }

  throw new Error(`Unsupported generated fixture extension: ${extension}`);
}

async function assertReadableAvif(filePath: string): Promise<void> {
  await assertFileExists(filePath);
  const image = sharp(await readFile(filePath));
  const metadata = await image.metadata();

  assert.strictEqual(metadata.format, "heif");
  assert.ok(metadata.width);
  assert.ok(metadata.width > 0);
  assert.ok(metadata.height);
  assert.ok(metadata.height > 0);
}

async function assertFileExists(filePath: string): Promise<void> {
  await assert.doesNotReject(access(filePath));
}

async function assertFileDoesNotExist(filePath: string): Promise<void> {
  await assert.rejects(access(filePath), (error) => {
    return error instanceof Error && "code" in error && error.code === "ENOENT";
  });
}

function replaceExtension(filePath: string, extension: string): string {
  return path.join(
    path.dirname(filePath),
    `${path.basename(filePath, path.extname(filePath))}${extension}`,
  );
}
