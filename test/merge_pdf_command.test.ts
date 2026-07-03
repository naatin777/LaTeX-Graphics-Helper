/* oxlint-disable vitest/expect-expect */

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";

import { PDFDocument } from "pdf-lib";
import { createSandbox } from "sinon";
import * as vscode from "vscode";

import { runCommandAndClearNotificationsUntilDone } from "./helpers/vscode_command.js";

const MERGE_PDF_SELECTED_PAGES_COMMAND = "latex-graphics-helper.mergePdf.selectedPages";

suite("PDF結合コマンド", () => {
  test("現行の選択PDF結合コマンドが登録されている", async () => {
    const commands = await vscode.commands.getCommands(true);

    assert.ok(commands.includes(MERGE_PDF_SELECTED_PAGES_COMMAND));
  });

  test("複数PDFを選択順に1つのPDFへ結合する", async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder);

    const sandbox = createSandbox();
    const temporaryDirectory = await mkdtemp(
      path.join(workspaceFolder.uri.fsPath, "lgh-merge-pdf-command-"),
    );

    try {
      const firstPdfPath = path.join(temporaryDirectory, "first.pdf");
      const secondPdfPath = path.join(temporaryDirectory, "second.pdf");
      const outputPath = path.join(temporaryDirectory, "merged.pdf");

      await writePdf(firstPdfPath, [120, 80]);
      await writePdf(secondPdfPath, [200, 100]);

      sandbox.stub(vscode.window, "showSaveDialog").resolves(vscode.Uri.file(outputPath));
      sandbox.stub(vscode.window, "showInformationMessage").resolves(undefined);
      sandbox.stub(vscode.window, "showErrorMessage").resolves(undefined);

      const commandExecution = vscode.commands.executeCommand(
        MERGE_PDF_SELECTED_PAGES_COMMAND,
        vscode.Uri.file(firstPdfPath),
        [vscode.Uri.file(firstPdfPath), vscode.Uri.file(secondPdfPath)],
      );

      await runCommandAndClearNotificationsUntilDone(commandExecution);

      const mergedPdf = await PDFDocument.load(await readFile(outputPath));
      assert.strictEqual(mergedPdf.getPageCount(), 2);
      assert.deepStrictEqual(mergedPdf.getPage(0).getSize(), { width: 120, height: 80 });
      assert.deepStrictEqual(mergedPdf.getPage(1).getSize(), { width: 200, height: 100 });
    } finally {
      sandbox.restore();
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
});

async function writePdf(filePath: string, size: [number, number]): Promise<void> {
  const document = await PDFDocument.create();
  document.addPage(size);
  await vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), await document.save());
}
