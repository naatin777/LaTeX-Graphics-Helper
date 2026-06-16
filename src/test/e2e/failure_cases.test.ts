import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { restore, stub } from 'sinon';
import * as vscode from 'vscode';

import { LatexDropEditProvider } from '../../edit_provider/latex_drop_edit_provider';
import { LatexPasteEditProvider } from '../../edit_provider/latex_paste_edit_provider';
import { localeMap } from '../../locale_map';
import {
    clipboardImageDataTransfer,
    configurePredictableOutputPaths,
    createCorruptPdf,
    createOutsideWorkspaceDirectory,
    createPdf,
    createPng,
    createTestDirectory,
    deleteDirectory,
    errorMessagesFromStub,
    loggerContains,
    openLatexDocument,
    pasteEditContext,
    restoreDefaultExecPaths,
    runExplorerContextCommand,
    setExecPath,
    settleCommandQueue,
    waitForErrorMessages,
    waitForFile,
} from './helpers';

const MISSING_EXECUTABLE = '/definitely/missing/latex-graphics-helper-tool';

suite('Explorer context menu failure e2e Test Suite', () => {
    suiteSetup(async () => {
        await vscode.extensions.getExtension('naatin777.latex-graphics-helper')!.activate();
        await configurePredictableOutputPaths();
    });

    setup(async () => {
        await configurePredictableOutputPaths();
        await restoreDefaultExecPaths();
    });

    teardown(async () => {
        restore();
        await restoreDefaultExecPaths();
    });

    test('should report an error when pdfcrop is not available', async () => {
        const directory = await createTestDirectory('fail-missing-pdfcrop');

        try {
            const inputUri = vscode.Uri.joinPath(directory, 'crop.pdf');
            const outputUri = vscode.Uri.joinPath(directory, 'crop-crop.pdf');
            const showErrorMessageStub = stub(vscode.window, 'showErrorMessage').resolves(
                undefined,
            );

            await createPdf(inputUri, 1);
            await setExecPath('pdfcrop', MISSING_EXECUTABLE);
            await runExplorerContextCommand('latex-graphics-helper.cropPdf', inputUri);
            await settleCommandQueue(500);

            const messages = errorMessagesFromStub(showErrorMessageStub);
            assert.ok(messages.length > 0, `Expected errors, got: ${messages.join(' | ')}`);
            assert.ok(
                messages.some((message) => /ENOENT|spawn/i.test(message)),
                `Expected ENOENT/spawn in: ${messages.join(' | ')}`,
            );
            assert.ok(loggerContains('failed'));
            await assert.rejects(async () => waitForFile(outputUri, 500));
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should report an error when cropping a corrupt PDF', async () => {
        const directory = await createTestDirectory('fail-corrupt-pdf');

        try {
            const inputUri = vscode.Uri.joinPath(directory, 'broken.pdf');
            const outputUri = vscode.Uri.joinPath(directory, 'broken-crop.pdf');
            const showErrorMessageStub = stub(vscode.window, 'showErrorMessage').resolves(
                undefined,
            );

            await createCorruptPdf(inputUri);
            await runExplorerContextCommand('latex-graphics-helper.cropPdf', inputUri);

            await waitForErrorMessages(showErrorMessageStub, 1);
            await assert.rejects(async () => waitForFile(outputUri, 500));
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should report workspaceFolderNotFound for files outside the workspace', async () => {
        const { directoryUri, cleanup } =
            await createOutsideWorkspaceDirectory('outside-workspace');
        const showErrorMessageStub = stub(vscode.window, 'showErrorMessage').resolves(undefined);

        try {
            const pdfUri = vscode.Uri.joinPath(directoryUri, 'outside.pdf');
            await createPdf(pdfUri, 1);

            await runExplorerContextCommand('latex-graphics-helper.cropPdf', pdfUri);
            await settleCommandQueue(500);

            const messages = errorMessagesFromStub(showErrorMessageStub);
            assert.ok(
                messages.some((message) => message.includes(localeMap('workspaceFolderNotFound'))),
                `Expected workspaceFolderNotFound in: ${messages.join(' | ')}`,
            );
        } finally {
            await cleanup();
        }
    });

    test('should continue batch processing and report only failed URIs', async () => {
        const directory = await createTestDirectory('fail-partial-batch');

        try {
            const goodUri = vscode.Uri.joinPath(directory, 'good.pdf');
            const badUri = vscode.Uri.joinPath(directory, 'bad.pdf');
            const goodOutputUri = vscode.Uri.joinPath(directory, 'good-crop.pdf');
            const showErrorMessageStub = stub(vscode.window, 'showErrorMessage').resolves(
                undefined,
            );

            await createPdf(goodUri, 1);
            await createCorruptPdf(badUri);

            await runExplorerContextCommand('latex-graphics-helper.cropPdf', goodUri, [
                goodUri,
                badUri,
            ]);

            await waitForFile(goodOutputUri);
            const messages = await waitForErrorMessages(showErrorMessageStub, 1);
            assert.strictEqual(messages.length, 1);
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should report an error when rsvg-convert is not available', async () => {
        const directory = await createTestDirectory('fail-missing-rsvg');

        try {
            const inputUri = vscode.Uri.joinPath(directory, 'icon.svg');
            const outputUri = vscode.Uri.joinPath(directory, 'icon.pdf');
            const showErrorMessageStub = stub(vscode.window, 'showErrorMessage').resolves(
                undefined,
            );

            const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>';
            await vscode.workspace.fs.writeFile(inputUri, Buffer.from(svg, 'utf8'));

            await setExecPath('rsvgConvert', MISSING_EXECUTABLE);
            await runExplorerContextCommand('latex-graphics-helper.convertSvgToPdf', inputUri);
            await settleCommandQueue(500);

            const messages = errorMessagesFromStub(showErrorMessageStub);
            assert.ok(messages.length > 0);
            assert.ok(messages.some((message) => /ENOENT|spawn/i.test(message)));
            await assert.rejects(async () => waitForFile(outputUri, 500));
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should report an error when merging corrupt PDFs', async () => {
        const directory = await createTestDirectory('fail-merge-corrupt');

        try {
            const goodUri = vscode.Uri.joinPath(directory, 'good.pdf');
            const badUri = vscode.Uri.joinPath(directory, 'bad.pdf');
            const outputUri = vscode.Uri.joinPath(directory, 'merged.pdf');
            const showErrorMessageStub = stub(vscode.window, 'showErrorMessage').resolves(
                undefined,
            );

            await createPdf(goodUri, 1);
            await createCorruptPdf(badUri);
            stub(vscode.window, 'showSaveDialog').resolves(outputUri);

            await runExplorerContextCommand('latex-graphics-helper.mergePdf', goodUri, [
                goodUri,
                badUri,
            ]);
            await settleCommandQueue(500);

            assert.ok(errorMessagesFromStub(showErrorMessageStub).length > 0);
            await assert.rejects(async () => waitForFile(outputUri, 500));
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should report an error when draw.io is not available', async function () {
        const directory = await createTestDirectory('fail-missing-drawio');

        try {
            const inputUri = vscode.Uri.joinPath(directory, 'diagram.drawio');
            const outputUri = vscode.Uri.joinPath(directory, 'diagram', 'Page-1.pdf');
            const showErrorMessageStub = stub(vscode.window, 'showErrorMessage').resolves(
                undefined,
            );

            const drawio = `<mxfile><diagram name="Page-1" id="p1"><mxGraphModel><root><mxCell id="0"/></root></mxGraphModel></diagram></mxfile>`;
            await vscode.workspace.fs.writeFile(inputUri, Buffer.from(drawio, 'utf8'));

            await setExecPath('drawio', MISSING_EXECUTABLE);
            await runExplorerContextCommand('latex-graphics-helper.convertDrawioToPdf', inputUri);
            await settleCommandQueue(500);

            const messages = errorMessagesFromStub(showErrorMessageStub);
            assert.ok(messages.length > 0);
            assert.ok(messages.some((message) => /ENOENT|spawn/i.test(message)));
            await assert.rejects(async () => waitForFile(outputUri, 500));
        } finally {
            await deleteDirectory(directory);
        }
    });
});

suite('LaTeX drop failure e2e Test Suite', () => {
    suiteSetup(async () => {
        await vscode.extensions.getExtension('naatin777.latex-graphics-helper')!.activate();
    });

    test('should not provide an edit when the URI list is empty', async () => {
        const directory = await createTestDirectory('drop-empty-uri-list');

        try {
            const documentUri = vscode.Uri.joinPath(directory, 'main.tex');
            await vscode.workspace.fs.writeFile(documentUri, Buffer.from('', 'utf8'));

            const document = await openLatexDocument(documentUri);
            const dataTransfer = new vscode.DataTransfer();
            dataTransfer.set('text/uri-list', new vscode.DataTransferItem('\r\n\r\n'));

            const tokenSource = new vscode.CancellationTokenSource();
            try {
                const edit = await new LatexDropEditProvider().provideDocumentDropEdits(
                    document,
                    new vscode.Position(0, 0),
                    dataTransfer,
                    tokenSource.token,
                );

                assert.strictEqual(edit, undefined);
            } finally {
                tokenSource.dispose();
            }
        } finally {
            await deleteDirectory(directory);
        }
    });
});

suite('LaTeX paste failure e2e Test Suite', () => {
    suiteSetup(async () => {
        await vscode.extensions.getExtension('naatin777.latex-graphics-helper')!.activate();
        await configurePredictableOutputPaths();
    });

    teardown(() => {
        restore();
    });

    test('should return no edits when the document is outside the workspace', async () => {
        const { directoryUri, cleanup } = await createOutsideWorkspaceDirectory('paste-outside');

        try {
            const documentPath = path.join(directoryUri.fsPath, 'outside.tex');
            await fs.promises.writeFile(documentPath, '\\documentclass{article}\n', 'utf8');
            const documentUri = vscode.Uri.file(documentPath);
            const document = await openLatexDocument(documentUri);

            const pngBytes = Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l0ud5AAAAABJRU5ErkJggg==',
                'base64',
            );

            const tokenSource = new vscode.CancellationTokenSource();
            try {
                const edits = await new LatexPasteEditProvider().provideDocumentPasteEdits(
                    document,
                    [new vscode.Range(1, 0, 1, 0)],
                    clipboardImageDataTransfer('image/png', pngBytes, 'clip.png'),
                    pasteEditContext(),
                    tokenSource.token,
                );

                assert.strictEqual(edits, undefined);
                assert.ok(loggerContains('outside workspace'));
            } finally {
                tokenSource.dispose();
            }
        } finally {
            await cleanup();
        }
    });

    test('should show an error when the clipboard output path is not writable', async () => {
        const directory = await createTestDirectory('paste-unwritable-output');

        try {
            const documentUri = vscode.Uri.joinPath(directory, 'main.tex');
            await vscode.workspace.fs.writeFile(
                documentUri,
                Buffer.from('\\documentclass{article}\n', 'utf8'),
            );

            const pngUri = vscode.Uri.joinPath(directory, 'clip.png');
            await createPng(pngUri);
            const pngBytes = await vscode.workspace.fs.readFile(pngUri);

            const showErrorMessageStub = stub(vscode.window, 'showErrorMessage').resolves(
                undefined,
            );

            const blockerUri = vscode.Uri.joinPath(directory, 'blocker');
            await vscode.workspace.fs.writeFile(blockerUri, Buffer.alloc(0));

            await vscode.workspace
                .getConfiguration('latex-graphics-helper')
                .update(
                    'outputPath.clipboardImage',
                    '${fileDirname}/blocker/sub/${fileBasenameNoExtension}-clip',
                    vscode.ConfigurationTarget.Workspace,
                );

            const document = await openLatexDocument(documentUri);
            const tokenSource = new vscode.CancellationTokenSource();
            try {
                const edits = await new LatexPasteEditProvider().provideDocumentPasteEdits(
                    document,
                    [new vscode.Range(1, 0, 1, 0)],
                    clipboardImageDataTransfer('image/png', pngBytes, 'clip.png'),
                    pasteEditContext(),
                    tokenSource.token,
                );

                assert.strictEqual(edits, undefined);
                assert.ok(errorMessagesFromStub(showErrorMessageStub).length > 0);
                assert.ok(loggerContains('clipboard paste failed'));
            } finally {
                tokenSource.dispose();
                await configurePredictableOutputPaths();
            }
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should show a warning when paste is cancelled via token', async () => {
        const directory = await createTestDirectory('paste-token-cancel');

        try {
            const documentUri = vscode.Uri.joinPath(directory, 'main.tex');
            await vscode.workspace.fs.writeFile(documentUri, Buffer.from('', 'utf8'));
            await createPng(vscode.Uri.joinPath(directory, 'clip.png'));

            const pngBytes = await vscode.workspace.fs.readFile(
                vscode.Uri.joinPath(directory, 'clip.png'),
            );
            const showWarningMessageStub = stub(vscode.window, 'showWarningMessage').resolves(
                undefined,
            );

            const document = await openLatexDocument(documentUri);
            const tokenSource = new vscode.CancellationTokenSource();
            tokenSource.cancel();

            try {
                await new LatexPasteEditProvider().provideDocumentPasteEdits(
                    document,
                    [new vscode.Range(0, 0, 0, 0)],
                    clipboardImageDataTransfer('image/png', pngBytes, 'clip.png'),
                    pasteEditContext(),
                    tokenSource.token,
                );

                assert.ok(
                    showWarningMessageStub.calledWith(localeMap('cancelled')),
                    'Expected cancelled warning when token is already cancelled',
                );
            } finally {
                tokenSource.dispose();
            }
        } finally {
            await deleteDirectory(directory);
        }
    });
});
