/* oxlint-disable vitest/expect-expect */

import assert from "node:assert/strict";
import { access, copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as vscode from "vscode";

import { runCommandAndClearNotifications } from "./helpers/vscode_command.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));

suite("Extension Test Suite", () => {
  test("extension is registered", () => {
    const extension = vscode.extensions.getExtension("naatin777.latex-graphics-helper");

    assert.ok(extension);
  });

  test("extension activates", async () => {
    const extension = vscode.extensions.getExtension("naatin777.latex-graphics-helper");

    assert.ok(extension);

    await extension.activate();

    assert.strictEqual(extension.isActive, true);
  });

  test("auto crop command is registered", async () => {
    const commands = await vscode.commands.getCommands(true);

    assert.ok(commands.includes("latex-graphics-helper.cropPdf.auto"));
  });

  test("split all pages command is registered", async () => {
    const commands = await vscode.commands.getCommands(true);

    assert.ok(commands.includes("latex-graphics-helper.splitPdf.allPages"));
  });

  test("convert PNG to PDF command is registered", async () => {
    const commands = await vscode.commands.getCommands(true);

    assert.ok(commands.includes("latex-graphics-helper.convertPngToPdf"));
  });

  test("convert PNG to PDF command executes and converts file", async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder);

    const temporaryDirectory = await mkdtemp(
      path.join(workspaceFolder.uri.fsPath, "lgh-extension-test-"),
    );

    try {
      const sourcePath = path.join(temporaryDirectory, "source.png");
      const outputPath = path.join(temporaryDirectory, "source.pdf");
      await copyFile(
        path.join(testDirectory, "..", "..", "test", "fixtures", "test.png"),
        sourcePath,
      );

      const commandExecution = vscode.commands.executeCommand(
        "latex-graphics-helper.convertPngToPdf",
        vscode.Uri.file(sourcePath),
      );
      await runCommandAndClearNotifications(commandExecution, () => waitForFile(outputPath));

      const { PDFDocument } = await import("pdf-lib");
      const pdf = await PDFDocument.load(await readFile(outputPath));
      assert.strictEqual(pdf.getPageCount(), 1);
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
});

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
