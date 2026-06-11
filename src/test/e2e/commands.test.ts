import * as assert from 'assert';

import sinon from 'sinon';
import * as vscode from 'vscode';

import { localeMap } from '../../locale_map';

import { createPdf, createPng, createTestDirectory, deleteDirectory, readPdfPageCount, waitForFile } from './helpers';

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
        await vscode.workspace.getConfiguration('latex-graphics-helper').update(
            'outputPath.splitPdf',
            '${fileDirname}/${fileBasenameNoExtension}-${page}.pdf',
            vscode.ConfigurationTarget.Workspace
        );
        await vscode.workspace.getConfiguration('latex-graphics-helper').update(
            'outputPath.convertPngToPdf',
            '${fileDirname}/${fileBasenameNoExtension}.pdf',
            vscode.ConfigurationTarget.Workspace
        );
    });

    teardown(() => {
        sinon.restore();
    });

    test('should register all contributed commands', async () => {
        const registeredCommands = await vscode.commands.getCommands(true);

        for (const commandId of commandIds) {
            assert.ok(registeredCommands.includes(commandId), `Expected command to be registered: ${commandId}`);
        }
    });

    test('should show an error when commands are invoked without selected files', async () => {
        const showErrorMessageStub = sinon.stub(vscode.window, 'showErrorMessage').resolves(undefined);

        for (const commandId of commandIds) {
            await vscode.commands.executeCommand(commandId);
        }

        assert.strictEqual(showErrorMessageStub.callCount, commandIds.length);
        for (const call of showErrorMessageStub.getCalls()) {
            assert.strictEqual(call.args[0], localeMap('noFilesSelected'));
        }
    });

    test('should split a PDF selected from the explorer', async () => {
        const directory = await createTestDirectory('split-pdf-command');

        try {
            const inputUri = vscode.Uri.joinPath(directory, 'source.pdf');
            const firstOutputUri = vscode.Uri.joinPath(directory, 'source-1.pdf');
            const secondOutputUri = vscode.Uri.joinPath(directory, 'source-2.pdf');

            await createPdf(inputUri, 2);

            await vscode.commands.executeCommand('latex-graphics-helper.splitPdf', inputUri, [inputUri]);
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
            const showSaveDialogStub = sinon.stub(vscode.window, 'showSaveDialog').resolves(outputUri);

            await createPdf(firstInputUri, 1);
            await createPdf(secondInputUri, 2);

            await vscode.commands.executeCommand(
                'latex-graphics-helper.mergePdf',
                firstInputUri,
                [firstInputUri, secondInputUri]
            );

            await waitForFile(outputUri);
            assert.strictEqual(showSaveDialogStub.calledOnce, true);
            assert.deepStrictEqual(showSaveDialogStub.firstCall.args[0], { filters: { PDF: ['pdf'] } });
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

            await vscode.commands.executeCommand('latex-graphics-helper.convertPngToPdf', inputUri, [inputUri]);
            await waitForFile(outputUri);

            assert.strictEqual(await readPdfPageCount(outputUri), 1);
        } finally {
            await deleteDirectory(directory);
        }
    });
});
