import * as assert from 'node:assert';

import { restore, stub } from 'sinon';
import * as vscode from 'vscode';

import { localeMap } from '../../locale_map';
import {
    configurePredictableOutputPaths,
    createPdf,
    createPng,
    createTestDirectory,
    deleteDirectory,
    loggerContains,
    readPdfPageCount,
    restoreDefaultExecPaths,
    runExplorerContextCommand,
    waitForFile,
    waitForFiles,
} from './helpers';

const commandIds = [
    'latex-graphics-helper.cropPdf',
    'latex-graphics-helper.splitPdf',
    'latex-graphics-helper.mergePdf',
    'latex-graphics-helper.convertDrawioToPdf',
    'latex-graphics-helper.convertPdfToPng',
    'latex-graphics-helper.convertPdfToJpeg',
    'latex-graphics-helper.convertPdfToSvg',
    'latex-graphics-helper.convertPngToPdf',
    'latex-graphics-helper.convertJpegToPdf',
    'latex-graphics-helper.convertSvgToPdf',
];

suite('VS Code command e2e Test Suite', () => {
    suiteSetup(async () => {
        await vscode.extensions.getExtension('naatin777.latex-graphics-helper')!.activate();
        await configurePredictableOutputPaths();
        await restoreDefaultExecPaths();
    });

    teardown(() => {
        restore();
    });

    test('should register all contributed commands', async () => {
        const registeredCommands = await vscode.commands.getCommands(true);

        for (const commandId of commandIds) {
            assert.ok(
                registeredCommands.includes(commandId),
                `Expected command to be registered: ${commandId}`,
            );
        }
    });

    test('should show an error when commands are invoked without selected files', async () => {
        const showErrorMessageStub = stub(vscode.window, 'showErrorMessage').resolves(undefined);

        for (const commandId of commandIds) {
            await vscode.commands.executeCommand(commandId);
        }

        assert.strictEqual(showErrorMessageStub.callCount, commandIds.length);
        for (const call of showErrorMessageStub.getCalls()) {
            assert.strictEqual(call.args[0], localeMap('noFilesSelected'));
        }
        assert.ok(loggerContains('no files selected'));
    });

    test('should crop a PDF selected from the explorer', async () => {
        const directory = await createTestDirectory('crop-pdf-command');

        try {
            const inputUri = vscode.Uri.joinPath(directory, 'crop.pdf');
            const outputUri = vscode.Uri.joinPath(directory, 'crop-crop.pdf');

            await createPdf(inputUri, 1);
            await runExplorerContextCommand('latex-graphics-helper.cropPdf', inputUri);
            await waitForFile(outputUri);

            assert.strictEqual(await readPdfPageCount(outputUri), 1);
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should convert two PNGs when both are selected in the explorer', async () => {
        const directory = await createTestDirectory('convert-two-pngs');

        try {
            const firstUri = vscode.Uri.joinPath(directory, 'left.png');
            const secondUri = vscode.Uri.joinPath(directory, 'right.png');

            await createPng(firstUri);
            await createPng(secondUri);
            await runExplorerContextCommand('latex-graphics-helper.convertPngToPdf', firstUri, [
                firstUri,
                secondUri,
            ]);
            await waitForFiles([
                vscode.Uri.joinPath(directory, 'left.pdf'),
                vscode.Uri.joinPath(directory, 'right.pdf'),
            ]);
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should split a PDF selected from the explorer', async () => {
        const directory = await createTestDirectory('split-pdf-command');

        try {
            const inputUri = vscode.Uri.joinPath(directory, 'source.pdf');
            const firstOutputUri = vscode.Uri.joinPath(directory, 'source-1.pdf');
            const secondOutputUri = vscode.Uri.joinPath(directory, 'source-2.pdf');

            await createPdf(inputUri, 2);

            await runExplorerContextCommand('latex-graphics-helper.splitPdf', inputUri);
            await Promise.all([waitForFile(firstOutputUri), waitForFile(secondOutputUri)]);

            assert.strictEqual(await readPdfPageCount(firstOutputUri), 1);
            assert.strictEqual(await readPdfPageCount(secondOutputUri), 1);
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should merge PDFs selected from the explorer into the chosen output file', async () => {
        const directory = await createTestDirectory('merge-pdf-command');

        try {
            const firstInputUri = vscode.Uri.joinPath(directory, 'one-page.pdf');
            const secondInputUri = vscode.Uri.joinPath(directory, 'two-pages.pdf');
            const outputUri = vscode.Uri.joinPath(directory, 'merged.pdf');
            const showSaveDialogStub = stub(vscode.window, 'showSaveDialog').resolves(outputUri);

            await createPdf(firstInputUri, 1);
            await createPdf(secondInputUri, 2);

            await runExplorerContextCommand('latex-graphics-helper.mergePdf', firstInputUri, [
                firstInputUri,
                secondInputUri,
            ]);

            await waitForFile(outputUri);
            assert.strictEqual(showSaveDialogStub.calledOnce, true);
            assert.deepStrictEqual(showSaveDialogStub.firstCall.args[0], {
                filters: { PDF: ['pdf'] },
            });
            assert.strictEqual(await readPdfPageCount(outputUri), 3);
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should convert a PNG selected from the explorer to a PDF', async () => {
        const directory = await createTestDirectory('convert-png-command');

        try {
            const inputUri = vscode.Uri.joinPath(directory, 'pixel.png');
            const outputUri = vscode.Uri.joinPath(directory, 'pixel.pdf');

            await createPng(inputUri);

            await runExplorerContextCommand('latex-graphics-helper.convertPngToPdf', inputUri);
            await waitForFile(outputUri);

            assert.strictEqual(await readPdfPageCount(outputUri), 1);
        } finally {
            await deleteDirectory(directory);
        }
    });
});
