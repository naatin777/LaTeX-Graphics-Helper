import * as assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';

import { restore, stub } from 'sinon';
import * as vscode from 'vscode';

import type { AppConfig } from '../../configuration';
import { convertDrawioToPdfDirectly } from '../../core/convert_drawio_to_pdf';
import { localeMap } from '../../locale_map';
import type { DrawioPath, ExecutablePath, PdfTemplatePath } from '../../type';
import * as createFolderUtils from '../../utils/create_folder';
import * as execFileUtils from '../../utils/exec_file_in_workspace';
import {
    createPdf,
    createPng,
    createTestDirectory,
    deleteDirectory,
    readPdfPageCount,
    waitForFile,
} from './helpers';

const commandIds = [
    'latex-graphics-helper.cropPdf',
    'latex-graphics-helper.splitPdf',
    'latex-graphics-helper.mergePdf',
    'latex-graphics-helper.convertDrawioToPdf',
    'latex-graphics-helper.convertDrawioToPdfDirectly',
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
        await vscode.workspace
            .getConfiguration('latex-graphics-helper')
            .update(
                'outputPath.splitPdf',
                '${fileDirname}/${fileBasenameNoExtension}-${page}.pdf',
                vscode.ConfigurationTarget.Workspace,
            );
        await vscode.workspace
            .getConfiguration('latex-graphics-helper')
            .update(
                'outputPath.convertPngToPdf',
                '${fileDirname}/${fileBasenameNoExtension}.pdf',
                vscode.ConfigurationTarget.Workspace,
            );
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

    test('should show both Draw.io PDF conversions for editable PNG and SVG files', async () => {
        const extension = vscode.extensions.getExtension('naatin777.latex-graphics-helper');
        assert.ok(extension);

        const packageJson = JSON.parse(
            await readFile(path.join(extension.extensionPath, 'package.json'), 'utf8'),
        );
        const explorerContext = packageJson.contributes.menus['explorer/context'];
        const explorerEntries = explorerContext.filter(
            (entry: { command?: string }) =>
                entry.command === 'latex-graphics-helper.convertDrawioToPdf' ||
                entry.command === 'latex-graphics-helper.convertDrawioToPdfDirectly',
        );

        assert.strictEqual(explorerEntries.length, 2);
        for (const explorerEntry of explorerEntries) {
            assert.ok(explorerEntry.when.includes('resourceExtname == .drawio'));
            assert.ok(explorerEntry.when.includes('resourceExtname == .dio'));
            assert.ok(explorerEntry.when.includes('resourceFilename =~'));
            assert.ok(explorerEntry.when.includes('(png|svg)'));
        }

        const pngToPdfEntry = explorerContext.find(
            (entry: { command?: string }) =>
                entry.command === 'latex-graphics-helper.convertPngToPdf',
        );
        const svgToPdfEntry = explorerContext.find(
            (entry: { command?: string }) =>
                entry.command === 'latex-graphics-helper.convertSvgToPdf',
        );

        assert.ok(pngToPdfEntry.when.includes('!(resourceFilename =~'));
        assert.ok(svgToPdfEntry.when.includes('!(resourceFilename =~'));
    });

    test('should export a Draw.io file directly to a single PDF', async () => {
        const workspaceFolder: vscode.WorkspaceFolder = {
            uri: vscode.Uri.file('/workspace'),
            name: 'workspace',
            index: 0,
        };
        const appConfig = { execPathDrawio: 'drawio' as ExecutablePath } as AppConfig;
        const outputTemplatePath =
            '${fileDirname}/converted/${fileBasenameNoExtension}.pdf' as PdfTemplatePath;
        const createFolderStub = stub(createFolderUtils, 'createFolder').resolves();
        const execFileInWorkspaceStub = stub(execFileUtils, 'execFileInWorkspace').resolves('');

        const outputPath = await convertDrawioToPdfDirectly(
            appConfig,
            '/workspace/diagram.drawio' as DrawioPath,
            outputTemplatePath,
            workspaceFolder,
        );

        assert.strictEqual(outputPath, '/workspace/converted/diagram.pdf');
        assert.deepStrictEqual(createFolderStub.firstCall.args, [outputPath]);
        assert.deepStrictEqual(execFileInWorkspaceStub.firstCall.args, [
            'drawio',
            [
                '/workspace/diagram.drawio',
                '-o',
                '/workspace/converted/diagram.pdf',
                '-x',
                '-f',
                'pdf',
                '-t',
                '-a',
                '--crop',
            ],
            workspaceFolder,
        ]);
    });

    test('should export an editable Draw.io PNG directly to a PDF', async () => {
        const workspaceFolder: vscode.WorkspaceFolder = {
            uri: vscode.Uri.file('/workspace'),
            name: 'workspace',
            index: 0,
        };
        const appConfig = { execPathDrawio: 'drawio' as ExecutablePath } as AppConfig;
        const outputTemplatePath =
            '${fileDirname}/${fileBasenameNoExtension}.pdf' as PdfTemplatePath;
        const createFolderStub = stub(createFolderUtils, 'createFolder').resolves();
        const execFileInWorkspaceStub = stub(execFileUtils, 'execFileInWorkspace').resolves('');

        const outputPath = await convertDrawioToPdfDirectly(
            appConfig,
            '/workspace/diagram.drawio.png' as DrawioPath,
            outputTemplatePath,
            workspaceFolder,
        );

        assert.strictEqual(outputPath, '/workspace/diagram.pdf');
        assert.deepStrictEqual(createFolderStub.firstCall.args, [outputPath]);
        assert.deepStrictEqual(execFileInWorkspaceStub.firstCall.args, [
            'drawio',
            [
                '/workspace/diagram.drawio.png',
                '-o',
                '/workspace/diagram.pdf',
                '-x',
                '-f',
                'pdf',
                '-t',
                '-a',
                '--crop',
            ],
            workspaceFolder,
        ]);
        assert.strictEqual(execFileInWorkspaceStub.callCount, 1);
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
    });

    test('should split a PDF selected from the explorer', async () => {
        const directory = await createTestDirectory('split-pdf-command');

        try {
            const inputUri = vscode.Uri.joinPath(directory, 'source.pdf');
            const firstOutputUri = vscode.Uri.joinPath(directory, 'source-1.pdf');
            const secondOutputUri = vscode.Uri.joinPath(directory, 'source-2.pdf');

            await createPdf(inputUri, 2);

            await vscode.commands.executeCommand('latex-graphics-helper.splitPdf', inputUri, [
                inputUri,
            ]);
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

            await vscode.commands.executeCommand('latex-graphics-helper.mergePdf', firstInputUri, [
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

            await vscode.commands.executeCommand(
                'latex-graphics-helper.convertPngToPdf',
                inputUri,
                [inputUri],
            );
            await waitForFile(outputUri);

            assert.strictEqual(await readPdfPageCount(outputUri), 1);
        } finally {
            await deleteDirectory(directory);
        }
    });
});
