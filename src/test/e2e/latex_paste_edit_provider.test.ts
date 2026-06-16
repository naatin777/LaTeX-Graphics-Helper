import * as assert from 'node:assert';

import { restore, stub } from 'sinon';
import * as vscode from 'vscode';

import { LatexPasteEditProvider } from '../../edit_provider/latex_paste_edit_provider';
import {
    applySnippetAt,
    clipboardImageDataTransfer,
    configurePasteClipboardImageAs,
    configurePredictableOutputPaths,
    createJpeg,
    createPng,
    createTestDirectory,
    deleteDirectory,
    loggerContains,
    openLatexDocument,
    pasteEditContext,
    readDocumentText,
    readPdfPageCount,
    waitForFile,
} from './helpers';

suite('LaTeX paste edit provider e2e Test Suite', () => {
    suiteSetup(async () => {
        await vscode.extensions.getExtension('naatin777.latex-graphics-helper')!.activate();
        await configurePredictableOutputPaths();
    });

    teardown(() => {
        restore();
    });

    test('should paste clipboard PNG as PDF into a LaTeX document', async () => {
        const directory = await createTestDirectory('paste-png-as-pdf');

        try {
            const documentUri = vscode.Uri.joinPath(directory, 'main.tex');
            await vscode.workspace.fs.writeFile(
                documentUri,
                Buffer.from('\\documentclass{article}\n', 'utf8'),
            );

            const pngUri = vscode.Uri.joinPath(directory, 'clipboard.png');
            await createPng(pngUri);
            const pngBytes = await vscode.workspace.fs.readFile(pngUri);

            const provider = new LatexPasteEditProvider();
            const document = await openLatexDocument(documentUri);
            const tokenSource = new vscode.CancellationTokenSource();
            try {
                const edits = await provider.provideDocumentPasteEdits(
                    document,
                    [new vscode.Range(1, 0, 1, 0)],
                    clipboardImageDataTransfer('image/png', pngBytes, 'clipboard.png'),
                    pasteEditContext(),
                    tokenSource.token,
                );

                assert.ok(edits && edits.length === 1);
                const snippet = edits[0].insertText;
                assert.ok(snippet instanceof vscode.SnippetString);

                await applySnippetAt(document, new vscode.Position(1, 0), snippet);

                const outputPdfUri = vscode.Uri.joinPath(directory, 'main-clipboard.pdf');
                await waitForFile(outputPdfUri);
                assert.strictEqual(await readPdfPageCount(outputPdfUri), 1);
                assert.ok(snippet.value.includes('\\includegraphics'));
            } finally {
                tokenSource.dispose();
            }
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should paste clipboard PNG as image into a LaTeX document', async () => {
        const directory = await createTestDirectory('paste-png-as-image');

        try {
            await configurePasteClipboardImageAs('image');

            const documentUri = vscode.Uri.joinPath(directory, 'main.tex');
            await vscode.workspace.fs.writeFile(
                documentUri,
                Buffer.from('\\documentclass{article}\n', 'utf8'),
            );

            const pngUri = vscode.Uri.joinPath(directory, 'clipboard.png');
            await createPng(pngUri);
            const pngBytes = await vscode.workspace.fs.readFile(pngUri);

            const provider = new LatexPasteEditProvider();
            const document = await openLatexDocument(documentUri);
            const tokenSource = new vscode.CancellationTokenSource();
            try {
                const edits = await provider.provideDocumentPasteEdits(
                    document,
                    [new vscode.Range(1, 0, 1, 0)],
                    clipboardImageDataTransfer('image/png', pngBytes, 'clipboard.png'),
                    pasteEditContext(),
                    tokenSource.token,
                );

                assert.ok(edits && edits.length === 1);
                const snippet = edits[0].insertText;
                assert.ok(snippet instanceof vscode.SnippetString);
                assert.ok(snippet.value.includes('\\includegraphics'));

                await applySnippetAt(document, new vscode.Position(1, 0), snippet);

                const outputImageUri = vscode.Uri.joinPath(directory, 'main-clipboard.png');
                await waitForFile(outputImageUri);
                assert.ok(loggerContains('clipboard paste as image'));
            } finally {
                tokenSource.dispose();
            }
        } finally {
            await configurePredictableOutputPaths();
            await deleteDirectory(directory);
        }
    });

    test('should paste clipboard JPEG as PDF into a LaTeX document', async () => {
        const directory = await createTestDirectory('paste-jpeg-as-pdf');

        try {
            const documentUri = vscode.Uri.joinPath(directory, 'main.tex');
            await vscode.workspace.fs.writeFile(
                documentUri,
                Buffer.from('\\documentclass{article}\n', 'utf8'),
            );

            const jpegUri = vscode.Uri.joinPath(directory, 'photo.jpg');
            await createJpeg(jpegUri);
            const jpegBytes = await vscode.workspace.fs.readFile(jpegUri);

            const provider = new LatexPasteEditProvider();
            const document = await openLatexDocument(documentUri);
            const tokenSource = new vscode.CancellationTokenSource();
            try {
                const edits = await provider.provideDocumentPasteEdits(
                    document,
                    [new vscode.Range(1, 0, 1, 0)],
                    clipboardImageDataTransfer('image/jpeg', jpegBytes, 'photo.jpg'),
                    pasteEditContext(),
                    tokenSource.token,
                );

                assert.ok(edits && edits.length === 1);
                await applySnippetAt(
                    document,
                    new vscode.Position(1, 0),
                    edits[0].insertText as vscode.SnippetString,
                );

                await waitForFile(vscode.Uri.joinPath(directory, 'main-clipboard.pdf'));
            } finally {
                tokenSource.dispose();
            }
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should paste clipboard JPEG as image into a nested LaTeX document', async () => {
        const directory = await createTestDirectory('paste-jpeg-nested');

        try {
            await configurePasteClipboardImageAs('image');

            const documentUri = vscode.Uri.joinPath(directory, 'sections', 'body.tex');
            await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(directory, 'sections'));
            await vscode.workspace.fs.writeFile(
                documentUri,
                Buffer.from('\\section{Intro}\n', 'utf8'),
            );

            const jpegUri = vscode.Uri.joinPath(directory, 'photo.jpg');
            await createJpeg(jpegUri);
            const jpegBytes = await vscode.workspace.fs.readFile(jpegUri);

            const provider = new LatexPasteEditProvider();
            const document = await openLatexDocument(documentUri);
            const tokenSource = new vscode.CancellationTokenSource();
            try {
                const edits = await provider.provideDocumentPasteEdits(
                    document,
                    [new vscode.Range(1, 0, 1, 0)],
                    clipboardImageDataTransfer('image/jpeg', jpegBytes, 'photo.jpg'),
                    pasteEditContext(vscode.DocumentPasteTriggerKind.PasteAs),
                    tokenSource.token,
                );

                assert.ok(edits && edits.length === 1);
                await applySnippetAt(
                    document,
                    new vscode.Position(1, 0),
                    edits[0].insertText as vscode.SnippetString,
                );

                await waitForFile(
                    vscode.Uri.joinPath(directory, 'sections', 'body-clipboard.jpeg'),
                );
                const text = await readDocumentText(documentUri);
                assert.ok(text.includes('\\includegraphics'));
            } finally {
                tokenSource.dispose();
            }
        } finally {
            await configurePredictableOutputPaths();
            await deleteDirectory(directory);
        }
    });

    test('should return no edits when the paste quick pick is cancelled', async () => {
        const directory = await createTestDirectory('paste-cancelled');

        try {
            await configurePasteClipboardImageAs('ask');

            const documentUri = vscode.Uri.joinPath(directory, 'main.tex');
            await vscode.workspace.fs.writeFile(documentUri, Buffer.from('', 'utf8'));

            const pngUri = vscode.Uri.joinPath(directory, 'clipboard.png');
            await createPng(pngUri);
            const pngBytes = await vscode.workspace.fs.readFile(pngUri);

            stub(vscode.window, 'showQuickPick').resolves(undefined);

            const provider = new LatexPasteEditProvider();
            const document = await openLatexDocument(documentUri);
            const tokenSource = new vscode.CancellationTokenSource();
            try {
                const edits = await provider.provideDocumentPasteEdits(
                    document,
                    [new vscode.Range(0, 0, 0, 0)],
                    clipboardImageDataTransfer('image/png', pngBytes, 'clipboard.png'),
                    pasteEditContext(),
                    tokenSource.token,
                );

                assert.strictEqual(edits, undefined);
                assert.ok(loggerContains('no format selected'));
            } finally {
                tokenSource.dispose();
            }
        } finally {
            await configurePredictableOutputPaths();
            await deleteDirectory(directory);
        }
    });

    test('should return no edits when the clipboard has no supported image', async () => {
        const directory = await createTestDirectory('paste-no-image');

        try {
            const documentUri = vscode.Uri.joinPath(directory, 'main.tex');
            await vscode.workspace.fs.writeFile(documentUri, Buffer.from('', 'utf8'));

            const provider = new LatexPasteEditProvider();
            const dataTransfer = new vscode.DataTransfer();
            dataTransfer.set('text/plain', new vscode.DataTransferItem('plain text'));

            const document = await openLatexDocument(documentUri);
            const tokenSource = new vscode.CancellationTokenSource();
            try {
                const edits = await provider.provideDocumentPasteEdits(
                    document,
                    [new vscode.Range(0, 0, 0, 0)],
                    dataTransfer,
                    pasteEditContext(),
                    tokenSource.token,
                );

                assert.strictEqual(edits, undefined);
            } finally {
                tokenSource.dispose();
            }
        } finally {
            await deleteDirectory(directory);
        }
    });
});
