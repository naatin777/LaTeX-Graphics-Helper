import assert from 'node:assert/strict';
import { access, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PDFDocument } from 'pdf-lib';
import { createSandbox } from 'sinon';
import * as vscode from 'vscode';

import { rememberLastConversion, undoLastConversionCommand } from '../src/commands/undo_last_conversion.js';
import { LatexPasteEditProvider } from '../src/edit_provider/latex_paste_edit_provider.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixtureDirectory = path.join(testDirectory, '..', '..', 'test', 'fixtures');

suite('LaTeXクリップボード画像挿入', () => {
  test('clipboard画像を画像ファイルとして保存しfigure snippetを作る', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder);

    const sandbox = createSandbox();
    const directory = await mkdtemp(path.join(workspaceFolder.uri.fsPath, 'lgh-latex-paste-'));

    try {
      const documentUri = vscode.Uri.file(path.join(directory, 'main.tex'));
      await vscode.workspace.fs.writeFile(documentUri, Buffer.from('', 'utf8'));
      sandbox.stub(vscode.window, 'showQuickPick').resolves({
        label: '画像形式で貼り付け',
        detail: '画像をfigure環境に配置',
        description: '(標準)',
        pasteKind: 'image',
      } as vscode.QuickPickItem & { pasteKind: 'image' });
      const showInputBox = sandbox.stub(vscode.window, 'showInputBox').resolves(path.join(directory, 'edited'));

      const document = await vscode.workspace.openTextDocument(documentUri);
      const provider = new LatexPasteEditProvider();
      const tokenSource = new vscode.CancellationTokenSource();

      try {
        const edits = await provider.provideDocumentPasteEdits(
          document,
          [new vscode.Range(0, 0, 0, 0)],
          pngDataTransfer(),
          {} as unknown as vscode.DocumentPasteEditContext,
          tokenSource.token,
          {
            ...testAppConfig(),
            outputPathClipboardImage: path.join(directory, 'pasted'),
          },
        );

        assert.ok(edits);
        assert.strictEqual(edits.length, 1);
        const edit = edits[0];
        assert.ok(edit);
        assert.ok(showInputBox.calledOnce);
        assert.strictEqual(showInputBox.firstCall.args[0]?.value, path.join(directory, 'pasted'));
        assert.ok(edit.insertText instanceof vscode.SnippetString);
        const snippet = normalizeSnippetValue(edit.insertText.value);
        assert.ok(snippet.includes('\\includegraphics[width=0.8\\linewidth]{edited.png}'));
        assert.ok(snippet.includes('\\caption{${1:edited}}'));
        assert.ok(await readFile(path.join(directory, 'edited.png')));
      } finally {
        tokenSource.dispose();
      }
    } finally {
      sandbox.restore();
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('Undo記録に失敗しても保存済み画像とPaste editを維持する', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder);

    const sandbox = createSandbox();
    const directory = await mkdtemp(path.join(workspaceFolder.uri.fsPath, 'lgh-latex-paste-undo-'));

    try {
      const documentUri = vscode.Uri.file(path.join(directory, 'main.tex'));
      await vscode.workspace.fs.writeFile(documentUri, Buffer.from('', 'utf8'));
      sandbox.stub(vscode.window, 'showQuickPick').resolves({
        label: '画像形式で貼り付け',
        detail: '画像をfigure環境に配置',
        description: '(標準)',
        pasteKind: 'image',
      } as vscode.QuickPickItem & { pasteKind: 'image' });
      sandbox.stub(vscode.window, 'showInputBox').resolves(path.join(directory, 'pasted'));
      const showWarningMessage = sandbox.stub(vscode.window, 'showWarningMessage').resolves(undefined);
      const document = await vscode.workspace.openTextDocument(documentUri);
      const provider = new LatexPasteEditProvider({
        rememberLastConversion: async () => {
          throw new Error('backup unavailable');
        },
      });
      const tokenSource = new vscode.CancellationTokenSource();

      try {
        const edits = await provider.provideDocumentPasteEdits(
          document,
          [new vscode.Range(0, 0, 0, 0)],
          pngDataTransfer(),
          {} as unknown as vscode.DocumentPasteEditContext,
          tokenSource.token,
          {
            ...testAppConfig(),
            outputPathClipboardImage: path.join(directory, 'pasted'),
          },
        );

        assert.ok(edits);
        assert.strictEqual(edits.length, 1);
        assert.ok(await readFile(path.join(directory, 'pasted.png')));
        const edit = edits[0];
        assert.ok(edit);
        assert.ok(edit.insertText instanceof vscode.SnippetString);
        assert.ok(normalizeSnippetValue(edit.insertText.value).includes('pasted.png'));
        assert.ok(showWarningMessage.calledOnce);
        await assert.rejects(access(path.join(directory, '.latex-graphics-helper', 'clipboard-paste')));
      } finally {
        tokenSource.dispose();
      }
    } finally {
      sandbox.restore();
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('clipboard画像をPDFとして保存しfigure snippetを作る', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder);

    const sandbox = createSandbox();
    const directory = await mkdtemp(path.join(workspaceFolder.uri.fsPath, 'lgh-latex-paste-pdf-'));

    try {
      const documentUri = vscode.Uri.file(path.join(directory, 'main.tex'));
      await vscode.workspace.fs.writeFile(documentUri, Buffer.from('', 'utf8'));
      const existingImagePath = path.join(directory, 'pasted.png');
      const existingPdfPath = path.join(directory, 'pasted.pdf');
      await writeFile(existingImagePath, 'existing clipboard image');
      const existingPdf = await createPdfBytes('old PDF');
      await writeFile(existingPdfPath, existingPdf);
      sandbox.stub(vscode.window, 'showQuickPick').resolves({
        label: 'PDF形式で貼り付け',
        detail: 'PDFをfigure環境に配置',
        description: '(標準)',
        pasteKind: 'pdf',
      } as vscode.QuickPickItem & { pasteKind: 'pdf' });
      sandbox.stub(vscode.window, 'showInputBox').resolves(path.join(directory, 'pasted'));
      sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

      const document = await vscode.workspace.openTextDocument(documentUri);
      const outputLines: string[] = [];
      let conversionRoot: string | undefined;
      const provider = new LatexPasteEditProvider({
        resolveOutputConflicts: async () => 'overwrite',
        outputChannel: { appendLine: (line) => outputLines.push(line) },
        rememberLastConversion: async (outputs) => {
          assert.ok(outputs[0]?.previousFilePath);
          conversionRoot = outputs[0]?.stagingRootPath;
          const id = await rememberLastConversion(outputs, {
            appendLine: (line) => outputLines.push(line),
          });
          await assert.doesNotReject(access(outputs[0]?.previousFilePath ?? ''));
          return id;
        },
      });
      const tokenSource = new vscode.CancellationTokenSource();

      try {
        const edits = await provider.provideDocumentPasteEdits(
          document,
          [new vscode.Range(0, 0, 0, 0)],
          pngDataTransfer(),
          {} as unknown as vscode.DocumentPasteEditContext,
          tokenSource.token,
          {
            ...testAppConfig(),
            outputPathClipboardImage: path.join(directory, 'pasted'),
          },
        );

        assert.ok(edits);
        assert.strictEqual(edits.length, 1);
        const edit = edits[0];
        assert.ok(edit);
        assert.ok(edit.insertText instanceof vscode.SnippetString);
        const snippet = normalizeSnippetValue(edit.insertText.value);
        assert.ok(snippet.includes('\\includegraphics[width=0.8\\linewidth]{pasted.pdf}'));
        const pdf = await PDFDocument.load(await readFile(path.join(directory, 'pasted.pdf')));
        assert.strictEqual(pdf.getPageCount(), 1);
        assert.strictEqual(await readFile(existingImagePath, 'utf8'), 'existing clipboard image');
        assert.notDeepStrictEqual(await readFile(existingPdfPath), existingPdf);

        assert.ok(conversionRoot);
        const backupPaths = await findFiles(conversionRoot, (filePath) => filePath.endsWith('.previous'));
        assert.strictEqual(backupPaths.length, 1, outputLines.join('\n'));
        assert.deepStrictEqual(await readFile(backupPaths[0] ?? ''), existingPdf);
        await assert.rejects(access(stagedRootFromLines(outputLines)));

        await undoLastConversionCommand();
        assert.deepStrictEqual(await readFile(existingPdfPath), existingPdf);
        await assert.rejects(access(conversionRoot));

        const keepBothProvider = new LatexPasteEditProvider({
          resolveOutputConflicts: async () => 'keep-both',
          outputChannel: {
            appendLine: (line) => outputLines.push(`keep-both: ${line}`),
          },
        });
        const keepBothEdits = await keepBothProvider.provideDocumentPasteEdits(
          document,
          [new vscode.Range(0, 0, 0, 0)],
          pngDataTransfer(),
          {} as unknown as vscode.DocumentPasteEditContext,
          tokenSource.token,
          {
            ...testAppConfig(),
            outputPathClipboardImage: path.join(directory, 'pasted'),
          },
        );
        assert.ok(keepBothEdits);
        assert.ok(await readFile(path.join(directory, 'pasted-1.pdf')));
        await assert.rejects(access(stagedRootFromLines(outputLines, 'keep-both: ')));
        await undoLastConversionCommand();
        await assert.rejects(access(path.join(directory, 'pasted-1.pdf')));
        assert.deepStrictEqual(await readFile(existingPdfPath), existingPdf);
      } finally {
        tokenSource.dispose();
      }
    } finally {
      sandbox.restore();
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('clipboard画像の既存出力を保持して競合解決後の出力を使う', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder);

    const sandbox = createSandbox();
    const directory = await mkdtemp(path.join(workspaceFolder.uri.fsPath, 'lgh-latex-paste-conflict-'));

    try {
      const documentUri = vscode.Uri.file(path.join(directory, 'main.tex'));
      const existingImagePath = path.join(directory, 'pasted.png');
      await vscode.workspace.fs.writeFile(documentUri, Buffer.from('', 'utf8'));
      await writeFile(existingImagePath, 'existing clipboard image');
      sandbox.stub(vscode.window, 'showQuickPick').resolves({
        label: '画像形式で貼り付け',
        detail: '画像をfigure環境に配置',
        description: '(標準)',
        pasteKind: 'image',
      } as vscode.QuickPickItem & { pasteKind: 'image' });
      sandbox.stub(vscode.window, 'showInputBox').resolves(path.join(directory, 'pasted'));
      const document = await vscode.workspace.openTextDocument(documentUri);
      const provider = new LatexPasteEditProvider({
        resolveOutputConflicts: async () => 'keep-both',
      });
      const tokenSource = new vscode.CancellationTokenSource();

      try {
        const edits = await provider.provideDocumentPasteEdits(
          document,
          [new vscode.Range(0, 0, 0, 0)],
          pngDataTransfer(),
          {} as unknown as vscode.DocumentPasteEditContext,
          tokenSource.token,
          {
            ...testAppConfig(),
            outputPathClipboardImage: path.join(directory, 'pasted'),
          },
        );

        assert.ok(edits);
        assert.strictEqual(await readFile(existingImagePath, 'utf8'), 'existing clipboard image');
        assert.ok(await readFile(path.join(directory, 'pasted-1.png')));
        const edit = edits[0];
        assert.ok(edit);
        assert.ok(edit.insertText instanceof vscode.SnippetString);
        assert.ok(normalizeSnippetValue(edit.insertText.value).includes('pasted-1.png'));
      } finally {
        tokenSource.dispose();
      }
    } finally {
      sandbox.restore();
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('変換開始前のcancelでは出力とstagingを作らない', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder);

    const sandbox = createSandbox();
    const directory = await mkdtemp(path.join(workspaceFolder.uri.fsPath, 'lgh-latex-paste-cancel-'));
    const tokenSource = new vscode.CancellationTokenSource();

    try {
      const documentUri = vscode.Uri.file(path.join(directory, 'main.tex'));
      await vscode.workspace.fs.writeFile(documentUri, Buffer.from('', 'utf8'));
      const showQuickPick = sandbox.stub(vscode.window, 'showQuickPick');
      sandbox.stub(vscode.window, 'showInputBox').resolves(path.join(directory, 'pasted'));
      tokenSource.cancel();

      const document = await vscode.workspace.openTextDocument(documentUri);
      const provider = new LatexPasteEditProvider();
      const edits = await provider.provideDocumentPasteEdits(
        document,
        [new vscode.Range(0, 0, 0, 0)],
        pngDataTransfer(),
        {} as unknown as vscode.DocumentPasteEditContext,
        tokenSource.token,
        {
          ...testAppConfig(),
          outputPathClipboardImage: path.join(directory, 'pasted'),
        },
      );

      assert.strictEqual(edits, undefined);
      assert.ok(showQuickPick.notCalled);
      await assert.rejects(access(path.join(directory, 'pasted.png')));
    } finally {
      tokenSource.dispose();
      sandbox.restore();
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('conflict処理中のcancelでは既存出力を変更せずstagingを削除する', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder);

    const sandbox = createSandbox();
    const directory = await mkdtemp(path.join(workspaceFolder.uri.fsPath, 'lgh-latex-paste-conflict-cancel-'));
    const tokenSource = new vscode.CancellationTokenSource();
    const lines: string[] = [];

    try {
      const documentUri = vscode.Uri.file(path.join(directory, 'main.tex'));
      const outputPath = path.join(directory, 'pasted.png');
      await vscode.workspace.fs.writeFile(documentUri, Buffer.from('', 'utf8'));
      await writeFile(outputPath, 'existing clipboard image');
      sandbox.stub(vscode.window, 'showQuickPick').resolves({
        label: '画像形式で貼り付け',
        detail: '画像をfigure環境に配置',
        description: '(標準)',
        pasteKind: 'image',
      } as vscode.QuickPickItem & { pasteKind: 'image' });
      sandbox.stub(vscode.window, 'showInputBox').resolves(path.join(directory, 'pasted'));

      const document = await vscode.workspace.openTextDocument(documentUri);
      const provider = new LatexPasteEditProvider({
        resolveOutputConflicts: async () => {
          tokenSource.cancel();
          return 'overwrite';
        },
        outputChannel: { appendLine: (line) => lines.push(line) },
      });
      const edits = await provider.provideDocumentPasteEdits(
        document,
        [new vscode.Range(0, 0, 0, 0)],
        pngDataTransfer(),
        {} as unknown as vscode.DocumentPasteEditContext,
        tokenSource.token,
        {
          ...testAppConfig(),
          outputPathClipboardImage: path.join(directory, 'pasted'),
        },
      );

      assert.strictEqual(edits, undefined);
      assert.strictEqual(await readFile(outputPath, 'utf8'), 'existing clipboard image');
      await assert.rejects(access(path.join(directory, '.latex-graphics-helper')));
      assert.ok(lines.some((line) => line.includes('cancellation requested')));
    } finally {
      tokenSource.dispose();
      sandbox.restore();
      await rm(directory, { recursive: true, force: true });
    }
  });
});

function pngDataTransfer(): vscode.DataTransfer {
  return {
    get(mime: string) {
      if (mime !== 'image/png') {
        return undefined;
      }

      return {
        asFile() {
          return {
            async data() {
              return readFile(path.join(fixtureDirectory, 'test.png'));
            },
          };
        },
      };
    },
  } as unknown as vscode.DataTransfer;
}

function testAppConfig() {
  return {
    figurePlacementOptions: ['[H]'],
    figureAlignmentOptions: ['\\centering'],
    figureGraphicsOptions: ['[width=0.8\\linewidth]'],
    subfigureVerticalAlignmentOptions: ['[t]'],
    subfigureWidthOptions: ['{0.45\\linewidth}'],
    subfigureSpacingOptions: ['\\hfill'],
  };
}

function normalizeSnippetValue(value: string): string {
  return value.replace(/\\\\/g, '\\').replace(/\\([{}])/g, '$1');
}

async function createPdfBytes(text: string): Promise<Buffer> {
  const document = await PDFDocument.create();
  const page = document.addPage([200, 100]);
  page.drawText(text);
  return Buffer.from(await document.save());
}

async function findFiles(rootPath: string, predicate: (filePath: string) => boolean): Promise<string[]> {
  try {
    const entries = await readdir(rootPath, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const entryPath = path.join(rootPath, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await findFiles(entryPath, predicate)));
      } else if (predicate(entryPath)) {
        files.push(entryPath);
      }
    }

    return files;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}

function stagedRootFromLines(lines: readonly string[], prefix = ''): string {
  const marker = `${prefix}[clipboard-paste] staged input: `;
  const line = lines.find((value) => value.startsWith(marker));

  assert.ok(line);
  return path.dirname(line.slice(marker.length));
}
