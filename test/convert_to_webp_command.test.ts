/* oxlint-disable vitest/expect-expect */

// Test target:
// - latex-graphics-helper.convertToWebp commandが登録されること
// - PNGをWebPへ変換できること
// - JPEG、AVIFをWebPへ変換できること
// - SVGをWebPへ変換できること
// - PDFをページごとのWebPへ変換できること
// - MermaidをWebPへ変換できること
// - WebPからWebPへは変換しないこと
// - 出力WebPが壊れておらず、幅と高さが0より大きいこと
//
// Not tested:
// - Draw.io → PDF → PNG → WebPの実変換経路
//   - fake Draw.io CLIをcommand testで直接扱うとWindowsのexecFile差で不安定になりやすい。
//   - 必要になったらrunnerを注入できるoperation testとして固定する。
// - PDF / Draw.io / MermaidからWebPへの変換ではPNGを中間形式に使うこと
//   - command testでは出力WebPの読み取り可能性を確認し、中間形式の詳細はoperation testで扱う。
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
const CONVERT_TO_WEBP_COMMAND = "latex-graphics-helper.convertToWebp";
const generatedSvgWidth = 31;
const generatedSvgHeight = 19;

const imageVariants = [
  {
    basename: "source-jpeg",
    extension: "jpeg",
  },
  {
    basename: "source-avif",
    extension: "avif",
  },
] as const;

suite("WebPに変換コマンド", () => {
  let sandbox: sinon.SinonSandbox;

  setup(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(vscode.window, "showInformationMessage").resolves(undefined);
    sandbox.stub(vscode.window, "showErrorMessage").resolves(undefined);
  });

  teardown(() => {
    sandbox.restore();
  });

  test("コマンドが登録されている", async () => {
    const commands = await vscode.commands.getCommands(true);

    assert.ok(commands.includes(CONVERT_TO_WEBP_COMMAND));
  });

  test("PNGを読み取り可能なWebPへ変換する", async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const sourcePath = path.join(temporaryDirectory, "source.png");
      const outputPath = path.join(temporaryDirectory, "source.webp");
      await copyFile(fixturePngPath, sourcePath);

      const commandExecution = vscode.commands.executeCommand(
        CONVERT_TO_WEBP_COMMAND,
        vscode.Uri.file(sourcePath),
      );
      await runCommandAndClearNotificationsUntilDone(commandExecution);

      await assertReadableWebp(outputPath);
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test("JPEG、AVIFを読み取り可能なWebPへ変換する", async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const sourcePaths = await Promise.all(
        imageVariants.map(async (variant) => {
          const sourcePath = path.join(
            temporaryDirectory,
            `${variant.basename}.${variant.extension}`,
          );
          await writeImageFixture(sourcePath, variant.extension);
          return sourcePath;
        }),
      );

      const commandExecution = vscode.commands.executeCommand(
        CONVERT_TO_WEBP_COMMAND,
        vscode.Uri.file(sourcePaths[0]!),
        sourcePaths.map((sourcePath) => vscode.Uri.file(sourcePath)),
      );
      await runCommandAndClearNotificationsUntilDone(commandExecution);

      await Promise.all(
        sourcePaths.map((sourcePath) => assertReadableWebp(replaceExtension(sourcePath, ".webp"))),
      );
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test("SVGを読み取り可能なWebPへ変換する", async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const sourcePath = path.join(temporaryDirectory, "source.svg");
      const outputPath = path.join(temporaryDirectory, "source.webp");
      await writeTestSvg(sourcePath, generatedSvgWidth, generatedSvgHeight);

      const commandExecution = vscode.commands.executeCommand(
        CONVERT_TO_WEBP_COMMAND,
        vscode.Uri.file(sourcePath),
      );
      await runCommandAndClearNotificationsUntilDone(commandExecution);

      await assertReadableWebp(outputPath);
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test("PDFをページごとの読み取り可能なWebPへ変換する", async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const sourcePath = path.join(temporaryDirectory, "source.pdf");
      const firstOutputPath = path.join(temporaryDirectory, "source-1.webp");
      const secondOutputPath = path.join(temporaryDirectory, "source-2.webp");
      await writeTwoPagePdf(sourcePath);

      const commandExecution = vscode.commands.executeCommand(
        CONVERT_TO_WEBP_COMMAND,
        vscode.Uri.file(sourcePath),
      );
      await runCommandAndClearNotificationsUntilDone(commandExecution);

      await assertReadableWebp(firstOutputPath);
      await assertReadableWebp(secondOutputPath);
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test(".mmdファイルを読み取り可能なWebPへ変換する", async () => {
    await assertMermaidFileConvertsToWebp("source.mmd");
  });

  test(".mermaidファイルを読み取り可能なWebPへ変換する", async () => {
    await assertMermaidFileConvertsToWebp("source.mermaid");
  });

  test("WebPからWebPへは変換しない", async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const sourcePath = path.join(temporaryDirectory, "source.webp");
      await writeImageFixture(sourcePath, "webp");

      await vscode.commands.executeCommand(CONVERT_TO_WEBP_COMMAND, vscode.Uri.file(sourcePath));

      await assertFileDoesNotExist(path.join(temporaryDirectory, "source-1.webp"));
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });
});

async function createTemporaryWorkspaceDirectory(): Promise<string> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(workspaceFolder);

  const temporaryDirectory = await mkdtemp(
    path.join(workspaceFolder.uri.fsPath, "lgh-convert-to-webp-"),
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

async function assertMermaidFileConvertsToWebp(fileName: string): Promise<void> {
  const temporaryDirectory = await createTemporaryWorkspaceDirectory();

  try {
    const sourcePath = path.join(temporaryDirectory, fileName);
    const outputPath = replaceExtension(sourcePath, ".webp");
    await writeFile(
      sourcePath,
      ["flowchart LR", "  A[Mermaid Alpha] --> B[Mermaid Beta]", ""].join("\n"),
    );

    const commandExecution = vscode.commands.executeCommand(
      CONVERT_TO_WEBP_COMMAND,
      vscode.Uri.file(sourcePath),
    );
    await runCommandAndClearNotificationsUntilDone(commandExecution);

    await assertReadableWebp(outputPath);
  } finally {
    await removeTemporaryDirectory(temporaryDirectory);
  }
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

  if (extension === "webp") {
    await image.webp().toFile(filePath);
    return;
  }

  if (extension === "avif") {
    await image.avif({ effort: 0 }).toFile(filePath);
    return;
  }

  throw new Error(`Unsupported generated fixture extension: ${extension}`);
}

async function assertReadableWebp(filePath: string): Promise<void> {
  await assertFileExists(filePath);
  const image = sharp(await readFile(filePath));
  const metadata = await image.metadata();

  assert.strictEqual(metadata.format, "webp");
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
