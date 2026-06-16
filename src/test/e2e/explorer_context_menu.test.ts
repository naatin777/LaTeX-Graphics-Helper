import * as assert from 'node:assert';

import { restore, stub } from 'sinon';
import * as vscode from 'vscode';

import {
    configureDrawioExecutable,
    configurePredictableOutputPaths,
    copyFixture,
    createJpeg,
    createPdf,
    createPng,
    createSvg,
    createTestDirectory,
    deleteDirectory,
    fileByteLength,
    readPdfPageCount,
    resolveDrawioExecutable,
    restoreDefaultExecPaths,
    runExplorerContextCommand,
    waitForFile,
    waitForFiles,
    workspaceFixturePath,
} from './helpers';

suite('Explorer context menu e2e Test Suite', () => {
    let drawioExecutable: string | undefined;

    suiteSetup(async () => {
        await vscode.extensions.getExtension('naatin777.latex-graphics-helper')!.activate();
        await configurePredictableOutputPaths();
        await restoreDefaultExecPaths();

        drawioExecutable = resolveDrawioExecutable();
        if (drawioExecutable) {
            await configureDrawioExecutable(drawioExecutable);
        }
    });

    teardown(() => {
        restore();
    });

    test('should open the seeded fixture workspace with main.tex', async () => {
        const mainTexUri = vscode.Uri.file(workspaceFixturePath('main.tex'));
        const sampleSvgUri = vscode.Uri.file(workspaceFixturePath('sample.svg'));

        await vscode.workspace.fs.stat(mainTexUri);
        await vscode.workspace.fs.stat(sampleSvgUri);

        const document = await vscode.workspace.openTextDocument(mainTexUri);
        assert.ok(document.getText().includes('\\documentclass{article}'));
    });

    test('should crop a PDF from the explorer context menu', async () => {
        const directory = await createTestDirectory('explorer-crop-pdf');

        try {
            const inputUri = vscode.Uri.joinPath(directory, 'crop-me.pdf');
            const outputUri = vscode.Uri.joinPath(directory, 'crop-me-crop.pdf');

            await createPdf(inputUri, 1);
            await runExplorerContextCommand('latex-graphics-helper.cropPdf', inputUri);
            await waitForFile(outputUri);

            assert.strictEqual(await readPdfPageCount(outputUri), 1);
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should split a PDF from the explorer context menu', async () => {
        const directory = await createTestDirectory('explorer-split-pdf');

        try {
            const inputUri = vscode.Uri.joinPath(directory, 'split-me.pdf');
            const firstOutputUri = vscode.Uri.joinPath(directory, 'split-me-1.pdf');
            const secondOutputUri = vscode.Uri.joinPath(directory, 'split-me-2.pdf');

            await createPdf(inputUri, 2);
            await runExplorerContextCommand('latex-graphics-helper.splitPdf', inputUri);
            await waitForFiles([firstOutputUri, secondOutputUri]);

            assert.strictEqual(await readPdfPageCount(firstOutputUri), 1);
            assert.strictEqual(await readPdfPageCount(secondOutputUri), 1);
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should merge PDFs from the explorer context menu', async () => {
        const directory = await createTestDirectory('explorer-merge-pdf');

        try {
            const firstInputUri = vscode.Uri.joinPath(directory, 'a.pdf');
            const secondInputUri = vscode.Uri.joinPath(directory, 'b.pdf');
            const outputUri = vscode.Uri.joinPath(directory, 'merged.pdf');
            stub(vscode.window, 'showSaveDialog').resolves(outputUri);

            await createPdf(firstInputUri, 1);
            await createPdf(secondInputUri, 2);
            await runExplorerContextCommand('latex-graphics-helper.mergePdf', firstInputUri, [
                firstInputUri,
                secondInputUri,
            ]);

            await waitForFile(outputUri);
            assert.strictEqual(await readPdfPageCount(outputUri), 3);
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should convert a PNG to PDF from the explorer context menu', async () => {
        const directory = await createTestDirectory('explorer-png-to-pdf');

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

    test('should convert a JPEG to PDF from the explorer context menu', async () => {
        const directory = await createTestDirectory('explorer-jpeg-to-pdf');

        try {
            const inputUri = vscode.Uri.joinPath(directory, 'photo.jpg');
            const outputUri = vscode.Uri.joinPath(directory, 'photo.pdf');

            await createJpeg(inputUri);
            await runExplorerContextCommand('latex-graphics-helper.convertJpegToPdf', inputUri);
            await waitForFile(outputUri);

            assert.strictEqual(await readPdfPageCount(outputUri), 1);
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should convert an SVG to PDF from the explorer context menu', async () => {
        const directory = await createTestDirectory('explorer-svg-to-pdf');

        try {
            const inputUri = vscode.Uri.joinPath(directory, 'vector.svg');
            const outputUri = vscode.Uri.joinPath(directory, 'vector.pdf');

            await createSvg(inputUri);
            await runExplorerContextCommand('latex-graphics-helper.convertSvgToPdf', inputUri);
            await waitForFile(outputUri);

            assert.strictEqual(await readPdfPageCount(outputUri), 1);
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should convert a PDF to PNG from the explorer context menu', async () => {
        const directory = await createTestDirectory('explorer-pdf-to-png');

        try {
            const inputUri = vscode.Uri.joinPath(directory, 'rasterize.pdf');
            const outputUri = vscode.Uri.joinPath(directory, 'rasterize-1.png');

            await createPdf(inputUri, 1);
            await runExplorerContextCommand('latex-graphics-helper.convertPdfToPng', inputUri);
            await waitForFile(outputUri);
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should convert a PDF to JPEG from the explorer context menu', async () => {
        const directory = await createTestDirectory('explorer-pdf-to-jpeg');

        try {
            const inputUri = vscode.Uri.joinPath(directory, 'rasterize.pdf');
            const outputUri = vscode.Uri.joinPath(directory, 'rasterize-1.jpeg');

            await createPdf(inputUri, 1);
            await runExplorerContextCommand('latex-graphics-helper.convertPdfToJpeg', inputUri);
            await waitForFile(outputUri);
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should convert a PDF to SVG from the explorer context menu', async () => {
        const directory = await createTestDirectory('explorer-pdf-to-svg');

        try {
            const inputUri = vscode.Uri.joinPath(directory, 'rasterize.pdf');
            const outputUri = vscode.Uri.joinPath(directory, 'rasterize-1.svg');

            await createPdf(inputUri, 1);
            await runExplorerContextCommand('latex-graphics-helper.convertPdfToSvg', inputUri);
            await waitForFile(outputUri);
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should convert a JPEG with .jpeg extension from the explorer context menu', async () => {
        const directory = await createTestDirectory('explorer-jpeg-ext');

        try {
            const inputUri = vscode.Uri.joinPath(directory, 'photo.jpeg');
            const outputUri = vscode.Uri.joinPath(directory, 'photo.pdf');

            await createJpeg(inputUri);
            await runExplorerContextCommand('latex-graphics-helper.convertJpegToPdf', inputUri);
            await waitForFile(outputUri);

            assert.strictEqual(await readPdfPageCount(outputUri), 1);
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should convert the workspace fixture SVG from the explorer context menu', async () => {
        const directory = await createTestDirectory('explorer-fixture-svg');

        try {
            const inputUri = vscode.Uri.joinPath(directory, 'from-fixture.svg');
            const outputUri = vscode.Uri.joinPath(directory, 'from-fixture.pdf');

            await copyFixture('sample.svg', inputUri);
            await runExplorerContextCommand('latex-graphics-helper.convertSvgToPdf', inputUri);
            await waitForFile(outputUri);

            assert.strictEqual(await readPdfPageCount(outputUri), 1);
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should convert multiple PNGs in one explorer context menu invocation', async () => {
        const directory = await createTestDirectory('explorer-multi-png');

        try {
            const firstUri = vscode.Uri.joinPath(directory, 'a.png');
            const secondUri = vscode.Uri.joinPath(directory, 'b.png');
            const firstOutputUri = vscode.Uri.joinPath(directory, 'a.pdf');
            const secondOutputUri = vscode.Uri.joinPath(directory, 'b.pdf');

            await createPng(firstUri);
            await createPng(secondUri);
            await runExplorerContextCommand('latex-graphics-helper.convertPngToPdf', firstUri, [
                firstUri,
                secondUri,
            ]);
            await waitForFiles([firstOutputUri, secondOutputUri]);

            assert.strictEqual(await readPdfPageCount(firstOutputUri), 1);
            assert.strictEqual(await readPdfPageCount(secondOutputUri), 1);
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should split a three-page PDF into three files from the explorer context menu', async () => {
        const directory = await createTestDirectory('explorer-split-3');

        try {
            const inputUri = vscode.Uri.joinPath(directory, 'three.pdf');
            const outputs = [1, 2, 3].map((page) =>
                vscode.Uri.joinPath(directory, `three-${page}.pdf`),
            );

            await createPdf(inputUri, 3);
            await runExplorerContextCommand('latex-graphics-helper.splitPdf', inputUri);
            await waitForFiles(outputs);

            for (const outputUri of outputs) {
                assert.strictEqual(await readPdfPageCount(outputUri), 1);
            }
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should crop a multi-page PDF from the explorer context menu', async () => {
        const directory = await createTestDirectory('explorer-crop-multi');

        try {
            const inputUri = vscode.Uri.joinPath(directory, 'multi.pdf');
            const outputUri = vscode.Uri.joinPath(directory, 'multi-crop.pdf');

            await createPdf(inputUri, 2);
            await runExplorerContextCommand('latex-graphics-helper.cropPdf', inputUri);
            await waitForFile(outputUri);

            assert.strictEqual(await readPdfPageCount(outputUri), 2);
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should merge three PDFs from the explorer context menu', async () => {
        const directory = await createTestDirectory('explorer-merge-3');

        try {
            const uris = [1, 2, 3].map((pages) => {
                const uri = vscode.Uri.joinPath(directory, `${pages}p.pdf`);
                return { pages, uri };
            });
            const outputUri = vscode.Uri.joinPath(directory, 'all.pdf');
            stub(vscode.window, 'showSaveDialog').resolves(outputUri);

            for (const { pages, uri } of uris) {
                await createPdf(uri, pages);
            }

            await runExplorerContextCommand(
                'latex-graphics-helper.mergePdf',
                uris[0].uri,
                uris.map(({ uri }) => uri),
            );
            await waitForFile(outputUri);

            assert.strictEqual(await readPdfPageCount(outputUri), 6);
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should convert each page of a two-page PDF to PNG from the explorer context menu', async () => {
        const directory = await createTestDirectory('explorer-pdf-to-png-2p');

        try {
            const inputUri = vscode.Uri.joinPath(directory, 'slides.pdf');
            const outputs = [1, 2].map((page) =>
                vscode.Uri.joinPath(directory, `slides-${page}.png`),
            );

            await createPdf(inputUri, 2);
            await runExplorerContextCommand('latex-graphics-helper.convertPdfToPng', inputUri);
            await waitForFiles(outputs);

            for (const outputUri of outputs) {
                assert.ok((await fileByteLength(outputUri)) > 0);
            }
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should convert each page of a two-page PDF to JPEG and SVG from the explorer context menu', async () => {
        const directory = await createTestDirectory('explorer-pdf-to-jpeg-svg-2p');

        try {
            const inputUri = vscode.Uri.joinPath(directory, 'slides.pdf');
            const jpegOutputs = [1, 2].map((page) =>
                vscode.Uri.joinPath(directory, `slides-${page}.jpeg`),
            );
            const svgOutputs = [1, 2].map((page) =>
                vscode.Uri.joinPath(directory, `slides-${page}.svg`),
            );

            await createPdf(inputUri, 2);
            await runExplorerContextCommand('latex-graphics-helper.convertPdfToJpeg', inputUri);
            await waitForFiles(jpegOutputs);

            await runExplorerContextCommand('latex-graphics-helper.convertPdfToSvg', inputUri);
            await waitForFiles(svgOutputs);
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should round-trip PNG to PDF to PNG from the explorer context menu', async () => {
        const directory = await createTestDirectory('explorer-roundtrip-png');

        try {
            const pngUri = vscode.Uri.joinPath(directory, 'roundtrip.png');
            const pdfUri = vscode.Uri.joinPath(directory, 'roundtrip.pdf');
            const convertedPngUri = vscode.Uri.joinPath(directory, 'roundtrip-1.png');

            await createPng(pngUri);
            await runExplorerContextCommand('latex-graphics-helper.convertPngToPdf', pngUri);
            await waitForFile(pdfUri);
            await runExplorerContextCommand('latex-graphics-helper.convertPdfToPng', pdfUri);
            await waitForFile(convertedPngUri);
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should not write a merged PDF when the save dialog is cancelled', async () => {
        const directory = await createTestDirectory('explorer-merge-cancel');

        try {
            const firstUri = vscode.Uri.joinPath(directory, 'one.pdf');
            const secondUri = vscode.Uri.joinPath(directory, 'two.pdf');
            const outputUri = vscode.Uri.joinPath(directory, 'merged.pdf');
            stub(vscode.window, 'showSaveDialog').resolves(undefined);

            await createPdf(firstUri, 1);
            await createPdf(secondUri, 1);
            await runExplorerContextCommand('latex-graphics-helper.mergePdf', firstUri, [
                firstUri,
                secondUri,
            ]);

            await assert.rejects(async () => waitForFile(outputUri, 500));
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should convert a .dio file from the explorer context menu', async function () {
        if (!drawioExecutable) {
            this.skip();
        }

        const directory = await createTestDirectory('explorer-dio');

        try {
            const inputUri = vscode.Uri.joinPath(directory, 'diagram.dio');
            const outputUri = vscode.Uri.joinPath(directory, 'diagram', 'Page-1.pdf');

            await copyFixture('sample.drawio', inputUri);
            await runExplorerContextCommand('latex-graphics-helper.convertDrawioToPdf', inputUri);
            await waitForFile(outputUri);
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should export each Draw.io tab as a separate PDF from the explorer context menu', async function () {
        if (!drawioExecutable) {
            this.skip();
        }

        const directory = await createTestDirectory('explorer-drawio-two-tabs');

        try {
            const inputUri = vscode.Uri.joinPath(directory, 'two-tabs.drawio');
            const tabAUri = vscode.Uri.joinPath(directory, 'two-tabs', 'Tab-A.pdf');
            const tabBUri = vscode.Uri.joinPath(directory, 'two-tabs', 'Tab-B.pdf');

            await copyFixture('sample-two-tabs.drawio', inputUri);
            await runExplorerContextCommand('latex-graphics-helper.convertDrawioToPdf', inputUri);
            await waitForFiles([tabAUri, tabBUri]);

            assert.strictEqual(await readPdfPageCount(tabAUri), 1);
            assert.strictEqual(await readPdfPageCount(tabBUri), 1);
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should convert a Draw.io file to PDF from the explorer context menu', async function () {
        if (!drawioExecutable) {
            this.skip();
        }

        const directory = await createTestDirectory('explorer-drawio-to-pdf');

        try {
            const inputUri = vscode.Uri.joinPath(directory, 'diagram.drawio');
            const outputUri = vscode.Uri.joinPath(directory, 'diagram', 'Page-1.pdf');

            await copyFixture('sample.drawio', inputUri);
            await runExplorerContextCommand('latex-graphics-helper.convertDrawioToPdf', inputUri);
            await waitForFile(outputUri);

            assert.strictEqual(await readPdfPageCount(outputUri), 1);
        } finally {
            await deleteDirectory(directory);
        }
    });
});
