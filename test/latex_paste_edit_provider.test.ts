/* oxlint-disable vitest/expect-expect */

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PDFDocument } from "pdf-lib";
import { createSandbox } from "sinon";
import * as vscode from "vscode";

import { LatexPasteEditProvider } from "../src/edit_provider/latex_paste_edit_provider.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixtureDirectory = path.join(testDirectory, "..", "..", "test", "fixtures");

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
        pasteKind: "image",
      } as vscode.QuickPickItem & { pasteKind: "image" });
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

  test("Undo記録に失敗しても保存済み画像とPaste editを維持する", async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder);

    const sandbox = createSandbox();
    const directory = await mkdtemp(path.join(workspaceFolder.uri.fsPath, "lgh-latex-paste-undo-"));

    try {
      const documentUri = vscode.Uri.file(path.join(directory, "main.tex"));
      await vscode.workspace.fs.writeFile(documentUri, Buffer.from("", "utf8"));
      sandbox.stub(vscode.window, "showQuickPick").resolves({
        label: "画像形式で貼り付け",
        detail: "画像をfigure環境に配置",
        description: "(標準)",
        pasteKind: "image",
      } as vscode.QuickPickItem & { pasteKind: "image" });
      sandbox.stub(vscode.window, "showInputBox").resolves(path.join(directory, "pasted"));
      const showWarningMessage = sandbox
        .stub(vscode.window, "showWarningMessage")
        .resolves(undefined);
      const document = await vscode.workspace.openTextDocument(documentUri);
      const provider = new LatexPasteEditProvider({
        rememberLastConversion: async () => {
          throw new Error("backup unavailable");
        },
      });
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
        assert.ok(await readFile(path.join(directory, "pasted.png")));
        const edit = edits[0];
        assert.ok(edit);
        assert.ok(edit.insertText instanceof vscode.SnippetString);
        assert.ok(normalizeSnippetValue(edit.insertText.value).includes("pasted.png"));
        assert.ok(showWarningMessage.calledOnce);
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
      const existingImagePath = path.join(directory, "pasted.png");
      await writeFile(existingImagePath, "existing clipboard image");
      sandbox.stub(vscode.window, "showQuickPick").resolves({
        label: "PDF形式で貼り付け",
        detail: "PDFをfigure環境に配置",
        description: "(標準)",
        pasteKind: "pdf",
      } as vscode.QuickPickItem & { pasteKind: "pdf" });
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
        assert.strictEqual(await readFile(existingImagePath, "utf8"), "existing clipboard image");
      } finally {
        tokenSource.dispose();
      }
    } finally {
      sandbox.restore();
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("clipboard画像の既存出力を保持して競合解決後の出力を使う", async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder);

    const sandbox = createSandbox();
    const directory = await mkdtemp(
      path.join(workspaceFolder.uri.fsPath, "lgh-latex-paste-conflict-"),
    );

    try {
      const documentUri = vscode.Uri.file(path.join(directory, "main.tex"));
      const existingImagePath = path.join(directory, "pasted.png");
      await vscode.workspace.fs.writeFile(documentUri, Buffer.from("", "utf8"));
      await writeFile(existingImagePath, "existing clipboard image");
      sandbox.stub(vscode.window, "showQuickPick").resolves({
        label: "画像形式で貼り付け",
        detail: "画像をfigure環境に配置",
        description: "(標準)",
        pasteKind: "image",
      } as vscode.QuickPickItem & { pasteKind: "image" });
      sandbox.stub(vscode.window, "showInputBox").resolves(path.join(directory, "pasted"));
      const document = await vscode.workspace.openTextDocument(documentUri);
      const provider = new LatexPasteEditProvider({
        resolveOutputConflicts: async () => "keep-both",
      });
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
        assert.strictEqual(await readFile(existingImagePath, "utf8"), "existing clipboard image");
        assert.ok(await readFile(path.join(directory, "pasted-1.png")));
        const edit = edits[0];
        assert.ok(edit);
        assert.ok(edit.insertText instanceof vscode.SnippetString);
        assert.ok(normalizeSnippetValue(edit.insertText.value).includes("pasted-1.png"));
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
              return readFile(path.join(fixtureDirectory, "test.png"));
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
