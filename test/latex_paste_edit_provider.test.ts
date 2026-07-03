/* oxlint-disable vitest/expect-expect */

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";

import { PDFDocument } from "pdf-lib";
import { createSandbox } from "sinon";
import * as vscode from "vscode";

import { LatexPasteEditProvider } from "../src/edit_provider/latex_paste_edit_provider.js";

suite("LaTeXクリップボード画像挿入", () => {
  test("clipboard画像を画像ファイルとして保存しfigure snippetを作る", async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder);

    const sandbox = createSandbox();
    const directory = await mkdtemp(path.join(workspaceFolder.uri.fsPath, "lgh-latex-paste-"));

    try {
      const documentUri = vscode.Uri.file(path.join(directory, "main.tex"));
      await vscode.workspace.fs.writeFile(documentUri, Buffer.from("", "utf8"));
      sandbox.stub(vscode.window, "showQuickPick").resolves({
        label: "画像形式で貼り付け",
        detail: "画像をfigure環境に配置",
        description: "(標準)",
      });
      const showInputBox = sandbox
        .stub(vscode.window, "showInputBox")
        .resolves(path.join(directory, "edited"));

      const document = await vscode.workspace.openTextDocument(documentUri);
      const provider = new LatexPasteEditProvider();
      const tokenSource = new vscode.CancellationTokenSource();

      try {
        const edits = await provider.provideDocumentPasteEdits(
          document,
          [new vscode.Range(0, 0, 0, 0)],
          pngDataTransfer(),
          {} as vscode.DocumentPasteEditContext,
          tokenSource.token,
          {
            ...testAppConfig(),
            outputPathClipboardImage: path.join(directory, "pasted"),
          },
        );

        assert.ok(edits);
        assert.strictEqual(edits.length, 1);
        const edit = edits[0];
        assert.ok(edit);
        assert.ok(showInputBox.calledOnce);
        assert.strictEqual(showInputBox.firstCall.args[0]?.value, path.join(directory, "pasted"));
        assert.ok(edit.insertText instanceof vscode.SnippetString);
        const snippet = normalizeSnippetValue(edit.insertText.value);
        assert.ok(snippet.includes("\\includegraphics[width=0.8\\linewidth]{edited.png}"));
        assert.ok(snippet.includes("\\caption{${1:edited}}"));
        assert.ok(await readFile(path.join(directory, "edited.png")));
      } finally {
        tokenSource.dispose();
      }
    } finally {
      sandbox.restore();
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("clipboard画像をPDFとして保存しfigure snippetを作る", async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder);

    const sandbox = createSandbox();
    const directory = await mkdtemp(path.join(workspaceFolder.uri.fsPath, "lgh-latex-paste-pdf-"));

    try {
      const documentUri = vscode.Uri.file(path.join(directory, "main.tex"));
      await vscode.workspace.fs.writeFile(documentUri, Buffer.from("", "utf8"));
      sandbox.stub(vscode.window, "showQuickPick").resolves({
        label: "PDF形式で貼り付け",
        detail: "PDFをfigure環境に配置",
        description: "(標準)",
      });
      sandbox.stub(vscode.window, "showInputBox").resolves(path.join(directory, "pasted"));

      const document = await vscode.workspace.openTextDocument(documentUri);
      const provider = new LatexPasteEditProvider();
      const tokenSource = new vscode.CancellationTokenSource();

      try {
        const edits = await provider.provideDocumentPasteEdits(
          document,
          [new vscode.Range(0, 0, 0, 0)],
          pngDataTransfer(),
          {} as vscode.DocumentPasteEditContext,
          tokenSource.token,
          {
            ...testAppConfig(),
            outputPathClipboardImage: path.join(directory, "pasted"),
          },
        );

        assert.ok(edits);
        assert.strictEqual(edits.length, 1);
        const edit = edits[0];
        assert.ok(edit);
        assert.ok(edit.insertText instanceof vscode.SnippetString);
        const snippet = normalizeSnippetValue(edit.insertText.value);
        assert.ok(snippet.includes("\\includegraphics[width=0.8\\linewidth]{pasted.pdf}"));
        const pdf = await PDFDocument.load(await readFile(path.join(directory, "pasted.pdf")));
        assert.strictEqual(pdf.getPageCount(), 1);
      } finally {
        tokenSource.dispose();
      }
    } finally {
      sandbox.restore();
      await rm(directory, { recursive: true, force: true });
    }
  });
});

function pngDataTransfer(): vscode.DataTransfer {
  return {
    get(mime: string) {
      if (mime !== "image/png") {
        return undefined;
      }

      return {
        asFile() {
          return {
            async data() {
              return readFile(path.join(process.cwd(), "test/fixtures/test.png"));
            },
          };
        },
      };
    },
  } as vscode.DataTransfer;
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

function normalizeSnippetValue(value: string): string {
  return value.replace(/\\\\/g, "\\").replace(/\\([{}])/g, "$1");
}
