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
        assert.ok(edits[0].insertText instanceof vscode.SnippetString);
        assert.ok(
          edits[0].insertText.value.includes("\\includegraphics[width=0.8\\linewidth]{pasted.png}"),
        );
        assert.ok(edits[0].insertText.value.includes("\\caption{${1:pasted}}"));
        assert.ok(await readFile(path.join(directory, "pasted.png")));
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
        assert.ok(edits[0].insertText instanceof vscode.SnippetString);
        assert.ok(
          edits[0].insertText.value.includes("\\includegraphics[width=0.8\\linewidth]{pasted.pdf}"),
        );
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
              return Buffer.from(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l0ud5AAAAABJRU5ErkJggg==",
                "base64",
              );
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
