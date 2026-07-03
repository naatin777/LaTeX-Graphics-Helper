/* oxlint-disable vitest/expect-expect */

import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";

import { PDFDocument } from "pdf-lib";
import * as vscode from "vscode";

import { LatexDropEditProvider } from "../src/edit_provider/latex_drop_edit_provider.js";

suite("LaTeXファイルdrag挿入", () => {
  test("単一PDFのdropからfigure snippetを作る", async () => {
    const directory = await createTemporaryWorkspaceDirectory("lgh-latex-drop-single-");

    try {
      const documentUri = vscode.Uri.file(path.join(directory, "main.tex"));
      const figuresDirectory = path.join(directory, "figures");
      const pdfUri = vscode.Uri.file(path.join(figuresDirectory, "sample.pdf"));

      await vscode.workspace.fs.createDirectory(vscode.Uri.file(figuresDirectory));
      await vscode.workspace.fs.writeFile(documentUri, Buffer.from("", "utf8"));
      await writePdf(pdfUri);

      const document = await vscode.workspace.openTextDocument(documentUri);
      const edit = await provideDropEdit(document, [pdfUri]);
      const snippet = snippetValue(edit);

      assert.match(snippet, /\\begin\{figure\}/);
      assert.ok(snippet.includes("\\includegraphics[width=0.8\\linewidth]{figures/sample.pdf}"));
      assert.ok(snippet.includes("\\caption{${1:sample}}"));
      assert.ok(snippet.includes("\\label{fig:${2:sample}}"));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("複数PDFのdropから複数図用snippetを作る", async () => {
    const directory = await createTemporaryWorkspaceDirectory("lgh-latex-drop-multiple-");

    try {
      const documentUri = vscode.Uri.file(path.join(directory, "main.tex"));
      const figuresDirectory = path.join(directory, "figures");
      const firstPdfUri = vscode.Uri.file(path.join(figuresDirectory, "first.pdf"));
      const secondPdfUri = vscode.Uri.file(path.join(figuresDirectory, "second.pdf"));

      await vscode.workspace.fs.createDirectory(vscode.Uri.file(figuresDirectory));
      await vscode.workspace.fs.writeFile(documentUri, Buffer.from("", "utf8"));
      await writePdf(firstPdfUri);
      await writePdf(secondPdfUri);

      const document = await vscode.workspace.openTextDocument(documentUri);
      const edit = await provideDropEdit(document, [firstPdfUri, secondPdfUri]);
      const snippet = snippetValue(edit);

      assert.strictEqual(snippet.split("\\begin{minipage}").length - 1, 2);
      assert.ok(snippet.includes("\\includegraphics[width=0.8\\linewidth]{figures/first.pdf}"));
      assert.ok(snippet.includes("\\includegraphics[width=0.8\\linewidth]{figures/second.pdf}"));
      assert.ok(snippet.includes("\\hfill"));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

async function provideDropEdit(
  document: vscode.TextDocument,
  uris: vscode.Uri[],
): Promise<vscode.DocumentDropEdit> {
  const provider = new LatexDropEditProvider();
  const dataTransfer = new vscode.DataTransfer();
  dataTransfer.set(
    "text/uri-list",
    new vscode.DataTransferItem(uris.map((uri) => uri.toString()).join("\r\n")),
  );
  const tokenSource = new vscode.CancellationTokenSource();

  try {
    const edit = await provider.provideDocumentDropEdits(
      document,
      new vscode.Position(0, 0),
      dataTransfer,
      tokenSource.token,
      testAppConfig(),
    );

    assert.ok(edit);
    assert.ok(!Array.isArray(edit));
    return edit;
  } finally {
    tokenSource.dispose();
  }
}

function snippetValue(edit: vscode.DocumentDropEdit): string {
  assert.ok(edit.insertText instanceof vscode.SnippetString);
  return edit.insertText.value;
}

async function writePdf(uri: vscode.Uri): Promise<void> {
  const document = await PDFDocument.create();
  document.addPage([120, 80]);
  await vscode.workspace.fs.writeFile(uri, await document.save());
}

async function createTemporaryWorkspaceDirectory(prefix: string): Promise<string> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(workspaceFolder);
  return mkdtemp(path.join(workspaceFolder.uri.fsPath, prefix));
}

function testAppConfig() {
  return {
    figurePlacementOptions: ["[H]"],
    figureAlignmentOptions: ["\\centering"],
    figureGraphicsOptions: ["[width=0.8\\linewidth]"],
    subfigureVerticalAlignmentOptions: ["[t]"],
    subfigureWidthOptions: ["{0.45\\linewidth}"],
    subfigureSpacingOptions: ["\\hfill"],
  };
}
