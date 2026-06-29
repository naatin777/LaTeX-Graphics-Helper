/* oxlint-disable vitest/expect-expect */

// Test target:
// - latex-graphics-helper.convertToPng commandが登録されること
// - PDFをPNGに変換できること
// - outputPath.convertPdfToPngの既定値に従ってページ番号付きのPNGを出力すること
// - PDFからPNGへ変換するとき、出力パス設定に${page}がない場合は変換を開始しないこと
// - 72dpiでPDFページサイズから出力PNGのpixel幅・高さを決めること
//
// Mocked:
// - VS Codeの通知API。通知UIの選択はここでは対象外にし、command completionを直接検証する。
//
// Not tested:
// - 複数ページPDF
// - PDF以外からPNGへの変換
// - Safe Modeダイアログの画面表示
// - VS Codeのprogress notificationの画面表示
// - cancellation tokenのUI操作

import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import sinon from "sinon";
import * as vscode from "vscode";

import { runCommandAndClearNotificationsUntilDone } from "./helpers/vscode_command.js";

const CONVERT_TO_PNG_COMMAND = "latex-graphics-helper.convertToPng";
const testPdfWidth = 120;
const testPdfHeight = 80;

suite("convertToPng command", () => {
  let sandbox: sinon.SinonSandbox;
  let showErrorMessage: sinon.SinonStub;

  setup(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(vscode.window, "showInformationMessage").resolves(undefined);
    showErrorMessage = sandbox.stub(vscode.window, "showErrorMessage").resolves(undefined);
  });

  teardown(() => {
    sandbox.restore();
  });

  test("command is registered", async () => {
    const commands = await vscode.commands.getCommands(true);

    assert.ok(commands.includes(CONVERT_TO_PNG_COMMAND));
  });

  test("converts a one-page PDF to a PNG with page size converted at 72dpi", async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const sourcePath = path.join(temporaryDirectory, "source.pdf");
      const outputPath = path.join(temporaryDirectory, "source-1.png");
      await writeTestPdf(sourcePath, testPdfWidth, testPdfHeight);

      const commandExecution = vscode.commands.executeCommand(
        CONVERT_TO_PNG_COMMAND,
        vscode.Uri.file(sourcePath),
      );
      await runCommandAndClearNotificationsUntilDone(commandExecution);

      const metadata = await sharp(outputPath).metadata();
      assert.strictEqual(metadata.width, testPdfWidth);
      assert.strictEqual(metadata.height, testPdfHeight);
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test("does not convert a PDF when the output path template does not include page", async () => {
    const configuration = vscode.workspace.getConfiguration("latex-graphics-helper");
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const sourcePath = path.join(temporaryDirectory, "source.pdf");
      const outputPath = path.join(temporaryDirectory, "source.png");
      await writeTestPdf(sourcePath, testPdfWidth, testPdfHeight);
      await configuration.update(
        "outputPath.convertPdfToPng",
        "${fileDirname}/${fileBasenameNoExtension}.png",
        vscode.ConfigurationTarget.Workspace,
      );

      const commandExecution = vscode.commands.executeCommand(
        CONVERT_TO_PNG_COMMAND,
        vscode.Uri.file(sourcePath),
      );
      await runCommandAndClearNotificationsUntilDone(commandExecution);

      assert.ok(
        showErrorMessage.calledWithMatch(
          sinon.match((message: unknown) => {
            return typeof message === "string" && message.includes("${page}");
          }),
        ),
      );
      await assertFileDoesNotExist(outputPath);
    } finally {
      await configuration.update(
        "outputPath.convertPdfToPng",
        undefined,
        vscode.ConfigurationTarget.Workspace,
      );
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });
});

async function createTemporaryWorkspaceDirectory(): Promise<string> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(workspaceFolder);

  const temporaryDirectory = await mkdtemp(
    path.join(workspaceFolder.uri.fsPath, "lgh-convert-to-png-"),
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

async function writeTestPdf(filePath: string, width: number, height: number): Promise<void> {
  const pdf = await PDFDocument.create();
  pdf.addPage([width, height]);
  await writeFile(filePath, await pdf.save());
}

async function assertFileDoesNotExist(filePath: string): Promise<void> {
  await assert.rejects(readFile(filePath), (error) => {
    return error instanceof Error && "code" in error && error.code === "ENOENT";
  });
}
