/* oxlint-disable vitest/expect-expect */

import assert from "node:assert/strict";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PDFDocument } from "pdf-lib";
import { createSandbox, match } from "sinon";
import * as vscode from "vscode";

import { assertRenderedPdfPagesSimilar } from "./helpers/pdf_visual_assertions.js";
import { runCommandAndClearNotificationsUntilDone } from "./helpers/vscode_command.js";
import { localeMap } from "../src/locale_map.js";

const MERGE_PDF_SELECTED_FILES_COMMAND = "latex-graphics-helper.mergePdf.selectedFiles";
const compiledTestDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixtureDirectory = path.resolve(
  compiledTestDirectory,
  "..",
  "..",
  "test",
  "fixtures",
  "pdf-operations",
  "user-files",
);
const firstFixturePath = path.join(fixtureDirectory, "q a.pdf");
const secondFixturePath = path.join(fixtureDirectory, " 薔薇🌹.pdf");

suite("PDF結合コマンド", () => {
  test("現行の選択PDF結合コマンドが登録されている", async () => {
    const commands = await vscode.commands.getCommands(true);

    assert.ok(commands.includes(MERGE_PDF_SELECTED_FILES_COMMAND));
    assert.ok(!commands.includes("latex-graphics-helper.mergePdf.selectedPages"));
  });

  test("複数PDFを選択順に1つのPDFへ結合する", async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder);

    const sandbox = createSandbox();
    const temporaryDirectory = await mkdtemp(
      path.join(workspaceFolder.uri.fsPath, "lgh-merge-pdf-command-"),
    );

    try {
      const firstPdfPath = path.join(temporaryDirectory, "q a.PDF");
      const secondPdfPath = path.join(temporaryDirectory, " 薔薇🌹.pdf");
      const outputPath = path.join(temporaryDirectory, "merged.pdf");
      const renderDirectory = path.join(temporaryDirectory, "rendered");

      await copyFile(firstFixturePath, firstPdfPath);
      await copyFile(secondFixturePath, secondPdfPath);
      await mkdir(renderDirectory);

      sandbox.stub(vscode.window, "showSaveDialog").resolves(vscode.Uri.file(outputPath));
      const showInformationMessage = sandbox
        .stub(vscode.window, "showInformationMessage")
        .resolves(undefined);
      sandbox.stub(vscode.window, "showErrorMessage").resolves(undefined);

      const commandExecution = vscode.commands.executeCommand(
        MERGE_PDF_SELECTED_FILES_COMMAND,
        vscode.Uri.file(firstPdfPath),
        [vscode.Uri.file(firstPdfPath), vscode.Uri.file(secondPdfPath)],
      );

      await runCommandAndClearNotificationsUntilDone(commandExecution);

      const mergedPdf = await PDFDocument.load(await readFile(outputPath));
      const firstPdf = await PDFDocument.load(await readFile(firstPdfPath));
      const secondPdf = await PDFDocument.load(await readFile(secondPdfPath));
      const expectedPageSizes = [...firstPdf.getPages(), ...secondPdf.getPages()].map((page) =>
        page.getSize(),
      );

      assert.strictEqual(mergedPdf.getPageCount(), expectedPageSizes.length);
      assert.deepStrictEqual(
        mergedPdf.getPages().map((page) => page.getSize()),
        expectedPageSizes,
      );
      assert.ok((await stat(outputPath)).size > 0);
      assert.ok(
        showInformationMessage.calledWith(
          localeMap("message.mergePdf.success").replace("{0}", "2"),
          match.any,
        ),
      );

      let outputPageNumber = 1;
      for (const [sourceIndex, sourcePath] of [firstPdfPath, secondPdfPath].entries()) {
        const sourceDocument = await PDFDocument.load(await readFile(sourcePath));
        for (
          let sourcePageNumber = 1;
          sourcePageNumber <= sourceDocument.getPageCount();
          sourcePageNumber += 1
        ) {
          await assertRenderedPdfPagesSimilar({
            expectedPdfPath: sourcePath,
            expectedPageNumber: sourcePageNumber,
            actualPdfPath: outputPath,
            actualPageNumber: outputPageNumber,
            renderDirectory,
            renderPrefix: `merge-${sourceIndex + 1}-${sourcePageNumber}`,
          });
          outputPageNumber += 1;
        }
      }
    } finally {
      sandbox.restore();
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  test("PDF以外を含む選択は結合せずエラー通知を出す", async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder);

    const sandbox = createSandbox();
    const temporaryDirectory = await mkdtemp(
      path.join(workspaceFolder.uri.fsPath, "lgh-merge-pdf-command-") + "-",
    );

    try {
      const firstPdfPath = path.join(temporaryDirectory, "q a.pdf");
      const secondPdfPath = path.join(temporaryDirectory, " 薔薇🌹.pdf");
      const textPath = path.join(temporaryDirectory, "notes.txt");
      await copyFile(firstFixturePath, firstPdfPath);
      await copyFile(secondFixturePath, secondPdfPath);
      await writeFile(textPath, "not a PDF");

      const showSaveDialog = sandbox.stub(vscode.window, "showSaveDialog");
      const showErrorMessage = sandbox.stub(vscode.window, "showErrorMessage").resolves(undefined);
      sandbox.stub(vscode.window, "showInformationMessage").resolves(undefined);

      const commandExecution = vscode.commands.executeCommand(
        MERGE_PDF_SELECTED_FILES_COMMAND,
        vscode.Uri.file(firstPdfPath),
        [vscode.Uri.file(firstPdfPath), vscode.Uri.file(secondPdfPath), vscode.Uri.file(textPath)],
      );

      await runCommandAndClearNotificationsUntilDone(commandExecution);

      assert.strictEqual(showSaveDialog.called, false);
      assert.strictEqual(showErrorMessage.calledOnce, true);
      await assert.rejects(access(path.join(temporaryDirectory, "merged.pdf")));
    } finally {
      sandbox.restore();
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  test("非file URIを含む選択は結合を開始しない", async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder);

    const sandbox = createSandbox();
    const temporaryDirectory = await mkdtemp(
      path.join(workspaceFolder.uri.fsPath, "lgh-merge-pdf-command-") + "-",
    );

    try {
      const firstPdfPath = path.join(temporaryDirectory, "first.pdf");
      const secondPdfPath = path.join(temporaryDirectory, "second.pdf");
      await copyFile(firstFixturePath, firstPdfPath);
      await copyFile(secondFixturePath, secondPdfPath);

      const showSaveDialog = sandbox.stub(vscode.window, "showSaveDialog");
      const showErrorMessage = sandbox.stub(vscode.window, "showErrorMessage").resolves(undefined);
      sandbox.stub(vscode.window, "showInformationMessage").resolves(undefined);

      const commandExecution = vscode.commands.executeCommand(
        MERGE_PDF_SELECTED_FILES_COMMAND,
        vscode.Uri.file(firstPdfPath),
        [
          vscode.Uri.file(firstPdfPath),
          vscode.Uri.file(secondPdfPath),
          vscode.Uri.parse("untitled:notes.pdf"),
        ],
      );

      await runCommandAndClearNotificationsUntilDone(commandExecution);

      assert.strictEqual(showSaveDialog.called, false);
      assert.strictEqual(showErrorMessage.calledOnce, true);
    } finally {
      sandbox.restore();
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  test("PDFが1ファイル以下の選択は結合せずエラー通知を出す", async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder);

    const sandbox = createSandbox();
    const temporaryDirectory = await mkdtemp(
      path.join(workspaceFolder.uri.fsPath, "lgh-merge-pdf-command-") + "-",
    );

    try {
      const pdfPath = path.join(temporaryDirectory, "q a.pdf");
      await copyFile(firstFixturePath, pdfPath);

      const showSaveDialog = sandbox.stub(vscode.window, "showSaveDialog");
      const showErrorMessage = sandbox.stub(vscode.window, "showErrorMessage").resolves(undefined);
      sandbox.stub(vscode.window, "showInformationMessage").resolves(undefined);

      const commandExecution = vscode.commands.executeCommand(
        MERGE_PDF_SELECTED_FILES_COMMAND,
        vscode.Uri.file(pdfPath),
        [vscode.Uri.file(pdfPath)],
      );

      await runCommandAndClearNotificationsUntilDone(commandExecution);

      assert.strictEqual(showSaveDialog.called, false);
      assert.strictEqual(showErrorMessage.calledOnce, true);
    } finally {
      sandbox.restore();
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  test("既存出力がある場合も成功した結合PDFで置き換える", async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder);

    const sandbox = createSandbox();
    const temporaryDirectory = await mkdtemp(
      path.join(workspaceFolder.uri.fsPath, "lgh-merge-pdf-command-") + "-",
    );

    try {
      const firstPdfPath = path.join(temporaryDirectory, "q a.pdf");
      const secondPdfPath = path.join(temporaryDirectory, " 薔薇🌹.pdf");
      const outputPath = path.join(temporaryDirectory, "merged.pdf");
      await copyFile(firstFixturePath, firstPdfPath);
      await copyFile(secondFixturePath, secondPdfPath);
      await copyFile(firstFixturePath, outputPath);

      sandbox.stub(vscode.window, "showSaveDialog").resolves(vscode.Uri.file(outputPath));
      sandbox.stub(vscode.window, "showInformationMessage").resolves(undefined);
      sandbox
        .stub(vscode.window, "showWarningMessage")
        .resolves({ title: localeMap("message.safeMode.overwrite") });
      sandbox.stub(vscode.window, "showErrorMessage").resolves(undefined);

      const commandExecution = vscode.commands.executeCommand(
        MERGE_PDF_SELECTED_FILES_COMMAND,
        vscode.Uri.file(firstPdfPath),
        [vscode.Uri.file(firstPdfPath), vscode.Uri.file(secondPdfPath)],
      );

      await runCommandAndClearNotificationsUntilDone(commandExecution);

      const mergedPdf = await PDFDocument.load(await readFile(outputPath));
      assert.strictEqual(mergedPdf.getPageCount(), 5);
      assert.ok((await stat(outputPath)).size > 0);
    } finally {
      sandbox.restore();
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  test("結合途中で失敗した場合は既存出力を変更しない", async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder);

    const sandbox = createSandbox();
    const temporaryDirectory = await mkdtemp(
      path.join(workspaceFolder.uri.fsPath, "lgh-merge-pdf-command-") + "-",
    );

    try {
      const firstPdfPath = path.join(temporaryDirectory, "q a.pdf");
      const brokenPdfPath = path.join(temporaryDirectory, "broken.pdf");
      const outputPath = path.join(temporaryDirectory, "merged.pdf");
      await copyFile(firstFixturePath, firstPdfPath);
      await writeFile(brokenPdfPath, "not a PDF");
      await copyFile(firstFixturePath, outputPath);
      const originalOutputBytes = await readFile(outputPath);

      sandbox.stub(vscode.window, "showSaveDialog").resolves(vscode.Uri.file(outputPath));
      sandbox.stub(vscode.window, "showInformationMessage").resolves(undefined);
      sandbox.stub(vscode.window, "showErrorMessage").resolves(undefined);

      const commandExecution = vscode.commands.executeCommand(
        MERGE_PDF_SELECTED_FILES_COMMAND,
        vscode.Uri.file(firstPdfPath),
        [vscode.Uri.file(firstPdfPath), vscode.Uri.file(brokenPdfPath)],
      );

      await runCommandAndClearNotificationsUntilDone(commandExecution);

      assert.deepStrictEqual(await readFile(outputPath), originalOutputBytes);
    } finally {
      sandbox.restore();
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
