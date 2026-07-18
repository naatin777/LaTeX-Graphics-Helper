import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument } from 'pdf-lib';
import * as vscode from 'vscode';

import { LatexDropEditProvider } from '../src/edit_provider/latex_drop_edit_provider.js';

suite('LaTeXファイルdrag挿入', () => {
  test('単一PDFのdropからfigure snippetを作る', async () => {
    const directory = await createTemporaryWorkspaceDirectory('lgh-latex-drop-single-');

    try {
      const documentUri = vscode.Uri.file(path.join(directory, 'main.tex'));
      const figuresDirectory = path.join(directory, 'figures');
      const pdfUri = vscode.Uri.file(path.join(figuresDirectory, 'sample.pdf'));

      await vscode.workspace.fs.createDirectory(vscode.Uri.file(figuresDirectory));
      await vscode.workspace.fs.writeFile(documentUri, Buffer.from('', 'utf8'));
      await writePdf(pdfUri);

      const document = await vscode.workspace.openTextDocument(documentUri);
      const edit = await provideDropEdit(document, [pdfUri], testAppConfig(['\\raggedleft']));
      const snippet = snippetValue(edit);

      assert.match(snippet, /\\begin\{figure\}/);
      assert.ok(snippet.includes('\\raggedleft'));
      assert.ok(!snippet.includes('\\centering'));
      assert.ok(snippet.includes('\\includegraphics[width=0.8\\linewidth]{figures/sample.pdf}'));
      assert.ok(snippet.includes('\\caption{${1:sample}}'));
      assert.ok(snippet.includes('\\label{fig:${2:sample}}'));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('複数PDFのdropから複数図用snippetを作る', async () => {
    const directory = await createTemporaryWorkspaceDirectory('lgh-latex-drop-multiple-');

    try {
      const documentUri = vscode.Uri.file(path.join(directory, 'main.tex'));
      const figuresDirectory = path.join(directory, 'figures');
      const firstPdfUri = vscode.Uri.file(path.join(figuresDirectory, 'first.pdf'));
      const secondPdfUri = vscode.Uri.file(path.join(figuresDirectory, 'second.pdf'));

      await vscode.workspace.fs.createDirectory(vscode.Uri.file(figuresDirectory));
      await vscode.workspace.fs.writeFile(documentUri, Buffer.from('', 'utf8'));
      await writePdf(firstPdfUri);
      await writePdf(secondPdfUri);

      const document = await vscode.workspace.openTextDocument(documentUri);
      const edit = await provideDropEdit(document, [firstPdfUri, secondPdfUri]);
      const snippet = snippetValue(edit);

      assert.strictEqual(snippet.split('\\begin{minipage}').length - 1, 2);
      assert.ok(snippet.includes('\\includegraphics[width=0.8\\linewidth]{figures/first.pdf}'));
      assert.ok(snippet.includes('\\includegraphics[width=0.8\\linewidth]{figures/second.pdf}'));
      assert.ok(snippet.includes('\\hfill'));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('URI-listの空行、comment、重複、拡張子大文字を処理する', async () => {
    const directory = await createTemporaryWorkspaceDirectory('lgh-latex-drop-uri-list-');

    try {
      const documentUri = vscode.Uri.file(path.join(directory, 'main.tex'));
      const pdfUri = vscode.Uri.file(path.join(directory, 'UPPER.PDF'));

      await vscode.workspace.fs.writeFile(documentUri, Buffer.from('', 'utf8'));
      await writePdf(pdfUri);

      const document = await vscode.workspace.openTextDocument(documentUri);
      const edit = await provideDropResult(
        document,
        `# dropped by the file manager\r\n\r\n${pdfUri.toString()}\r\n${pdfUri.toString()}\r\n`,
      );

      assert.ok(edit);
      const snippet = snippetValue(edit);
      assert.strictEqual(snippet.split('\\includegraphics').length - 1, 1);
      assert.ok(snippet.includes('UPPER.PDF'));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('非file・非PDF・壊れたURIを含むURI-listは部分処理しない', async () => {
    const directory = await createTemporaryWorkspaceDirectory('lgh-latex-drop-invalid-');

    try {
      const documentUri = vscode.Uri.file(path.join(directory, 'main.tex'));
      const pdfUri = vscode.Uri.file(path.join(directory, 'sample.pdf'));
      const imageUri = vscode.Uri.file(path.join(directory, 'sample.png'));

      await vscode.workspace.fs.writeFile(documentUri, Buffer.from('', 'utf8'));
      await writePdf(pdfUri);
      await vscode.workspace.fs.writeFile(imageUri, Buffer.from('image', 'utf8'));
      const document = await vscode.workspace.openTextDocument(documentUri);

      assert.strictEqual(
        await provideDropResult(document, `${pdfUri.toString()}\r\nhttps://example.test/a.pdf`),
        undefined,
      );
      assert.strictEqual(
        await provideDropResult(document, `${pdfUri.toString()}\r\n${imageUri.toString()}`),
        undefined,
      );
      assert.strictEqual(await provideDropResult(document, '%%%'), undefined);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('workspace外のlocal PDFはrelative pathで挿入する', async () => {
    const directory = await createTemporaryWorkspaceDirectory('lgh-latex-drop-document-');
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder);
    const outsideDirectory = await mkdtemp(
      path.join(path.dirname(workspaceFolder.uri.fsPath), 'lgh-latex-drop-outside-'),
    );

    try {
      const documentUri = vscode.Uri.file(path.join(directory, 'main.tex'));
      const pdfUri = vscode.Uri.file(path.join(outsideDirectory, 'outside.pdf'));

      await vscode.workspace.fs.writeFile(documentUri, Buffer.from('', 'utf8'));
      await writePdf(pdfUri);
      const document = await vscode.workspace.openTextDocument(documentUri);
      const edit = await provideDropResult(document, pdfUri.toString());

      assert.ok(edit);
      const snippet = snippetValue(edit);
      assert.ok(snippet.includes('\\includegraphics[width=0.8\\linewidth]{../'));
      assert.ok(snippet.includes('outside.pdf'));
    } finally {
      await rm(directory, { recursive: true, force: true });
      await rm(outsideDirectory, { recursive: true, force: true });
    }
  });

  test('cancel済みまたは未保存documentではsnippetを返さない', async () => {
    const directory = await createTemporaryWorkspaceDirectory('lgh-latex-drop-cancel-');

    try {
      const documentUri = vscode.Uri.file(path.join(directory, 'sample.pdf'));
      const mainDocumentUri = vscode.Uri.file(path.join(directory, 'main.tex'));
      await writePdf(documentUri);
      await vscode.workspace.fs.writeFile(mainDocumentUri, Buffer.from('', 'utf8'));
      const cancelledDocument = await vscode.workspace.openTextDocument(mainDocumentUri);
      const tokenSource = new vscode.CancellationTokenSource();
      tokenSource.cancel();

      assert.strictEqual(
        await provideDropResult(cancelledDocument, documentUri.toString(), tokenSource.token),
        undefined,
      );
      tokenSource.dispose();

      const unsavedDocument = await vscode.workspace.openTextDocument({
        language: 'latex',
        content: '',
      });
      assert.strictEqual(await provideDropResult(unsavedDocument, documentUri.toString()), undefined);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

async function provideDropEdit(
  document: vscode.TextDocument,
  uris: vscode.Uri[],
  config = testAppConfig(),
): Promise<vscode.DocumentDropEdit> {
  const edit = await provideDropResult(document, uris.map((uri) => uri.toString()).join('\r\n'), undefined, config);
  assert.ok(edit);
  return edit;
}

async function provideDropResult(
  document: vscode.TextDocument,
  uriList: string,
  token?: vscode.CancellationToken,
  config = testAppConfig(),
): Promise<vscode.DocumentDropEdit | undefined> {
  const provider = new LatexDropEditProvider();
  const dataTransfer = new vscode.DataTransfer();
  dataTransfer.set('text/uri-list', new vscode.DataTransferItem(uriList));
  const tokenSource = new vscode.CancellationTokenSource();

  try {
    return await provider.provideDocumentDropEdits(
      document,
      new vscode.Position(0, 0),
      dataTransfer,
      token ?? tokenSource.token,
      config,
    );
  } finally {
    tokenSource.dispose();
  }
}

function snippetValue(edit: vscode.DocumentDropEdit): string {
  assert.ok(edit.insertText instanceof vscode.SnippetString);
  return normalizeSnippetValue(edit.insertText.value);
}

function normalizeSnippetValue(value: string): string {
  return value.replace(/\\\\/g, '\\').replace(/\\([{}])/g, '$1');
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

function testAppConfig(figureAlignmentOptions = ['\\centering']) {
  return {
    outputPathClipboardImage: '${fileDirname}/${dateNow}',
    figurePlacementOptions: ['[H]'],
    figureAlignmentOptions,
    figureGraphicsOptions: ['[width=0.8\\linewidth]'],
    subfigureVerticalAlignmentOptions: ['[t]'],
    subfigureWidthOptions: ['{0.45\\linewidth}'],
    subfigureSpacingOptions: ['\\hfill'],
  };
}
