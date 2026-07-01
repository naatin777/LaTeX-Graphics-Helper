/* oxlint-disable vitest/expect-expect */

// Test target:
// - latex-graphics-helper.convertToSvg commandが登録されること
// - .mmdをSVGに変換できること
// - .mermaidをSVGに変換できること
// - PDFをページごとのSVGへ変換できること
// - SVG出力が壊れておらず、Mermaid由来のテキストを含むこと
//
// Mocked:
// - VS Codeの通知API。通知UIの選択はここでは対象外にし、command completionを直接検証する。
//
// Not tested:
// - Draw.io → SVGの実CLI経路
//   - fake Draw.io CLIをcommand testで直接扱うとWindowsのexecFile差で不安定になりやすい。
//   - runnerを注入できるoperation testとして固定する。
// - Mermaid → PDF / PNG / JPEG / WebP / AVIF
// - Mermaid theme / look / backgroundColor
// - context menuの画面上の表示
// - Safe Modeダイアログの画面表示
// - VS Codeのprogress notificationの画面表示
// - cancellation tokenのUI操作

import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument } from "pdf-lib";
import sinon from "sinon";
import * as vscode from "vscode";

import { runCommandAndClearNotificationsUntilDone } from "./helpers/vscode_command.js";

const CONVERT_TO_SVG_COMMAND = "latex-graphics-helper.convertToSvg";

suite("SVGに変換コマンド", () => {
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

    assert.ok(commands.includes(CONVERT_TO_SVG_COMMAND));
  });

  test(".mmdファイルをSVGへ変換する", async () => {
    await assertMermaidFileConvertsToSvg("source.mmd");
  });

  test(".mermaidファイルをSVGへ変換する", async () => {
    await assertMermaidFileConvertsToSvg("source.mermaid");
  });

  test("PDFをページごとのSVGへ変換する", async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const sourcePath = path.join(temporaryDirectory, "source.pdf");
      const firstOutputPath = path.join(temporaryDirectory, "source-1.svg");
      const secondOutputPath = path.join(temporaryDirectory, "source-2.svg");
      await writeTwoPagePdf(sourcePath);

      const commandExecution = vscode.commands.executeCommand(
        CONVERT_TO_SVG_COMMAND,
        vscode.Uri.file(sourcePath),
      );
      await runCommandAndClearNotificationsUntilDone(commandExecution);

      await assertGeneratedSvg(firstOutputPath);
      await assertGeneratedSvg(secondOutputPath);
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });
});

async function assertMermaidFileConvertsToSvg(fileName: string): Promise<void> {
  const temporaryDirectory = await createTemporaryWorkspaceDirectory();

  try {
    const sourcePath = path.join(temporaryDirectory, fileName);
    const outputPath = replaceExtension(sourcePath, ".svg");
    await writeFile(
      sourcePath,
      ["flowchart LR", "  A[Mermaid Alpha] --> B[Mermaid Beta]", ""].join("\n"),
    );

    const commandExecution = vscode.commands.executeCommand(
      CONVERT_TO_SVG_COMMAND,
      vscode.Uri.file(sourcePath),
    );
    await runCommandAndClearNotificationsUntilDone(commandExecution);

    await assertGeneratedMermaidSvg(outputPath);
  } finally {
    await removeTemporaryDirectory(temporaryDirectory);
  }
}

async function createTemporaryWorkspaceDirectory(): Promise<string> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(workspaceFolder);

  const temporaryDirectory = await mkdtemp(
    path.join(workspaceFolder.uri.fsPath, "lgh-convert-to-svg-"),
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

async function assertGeneratedMermaidSvg(filePath: string): Promise<void> {
  const svg = await readFile(filePath, "utf8");

  assert.match(svg, /<svg[\s>]/);
  assert.match(svg, /Mermaid Alpha/);
  assert.match(svg, /Mermaid Beta/);
}

async function writeTwoPagePdf(filePath: string): Promise<void> {
  const document = await PDFDocument.create();
  document.addPage([72, 36]);
  document.addPage([36, 72]);
  await writeFile(filePath, await document.save());
}

async function assertGeneratedSvg(filePath: string): Promise<void> {
  const svg = await readFile(filePath, "utf8");

  assert.match(svg, /<svg[\s>]/);
}

function replaceExtension(filePath: string, extension: string): string {
  return path.join(
    path.dirname(filePath),
    `${path.basename(filePath, path.extname(filePath))}${extension}`,
  );
}
