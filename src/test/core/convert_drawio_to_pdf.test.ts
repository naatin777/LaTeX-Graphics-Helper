import * as assert from 'node:assert';
import { EventEmitter, once } from 'node:events';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { PDFDocument } from 'pdf-lib';
import type { SinonStub } from 'sinon';
import { restore, stub } from 'sinon';
import * as vscode from 'vscode';

import type { AppConfig } from '../../configuration';
import { convertDrawioToPdf } from '../../core/convert_drawio_to_pdf';
import type { DrawioPath, ExecutablePath, PdfTemplatePath } from '../../type';
import * as execFileUtils from '../../utils/exec_file_in_workspace';

type StubPhase = 'xml' | 'pdf' | 'crop';

interface ExecStubOptions {
    editableImageXml?: string;
    pageCountBySource?: Map<string, number>;
    failPhase?: { phase: StubPhase; error: Error };
    afterPdfExport?: (info: { sourcePath: string; outputPath: string }) => Promise<void>;
}

function createDrawioXml(tabNames: string[]): string {
    const diagrams = tabNames
        .map(
            (name, index) =>
                `<diagram id="diagram-${index}" name="${name}"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram>`,
        )
        .join('');
    return `<?xml version="1.0" encoding="UTF-8"?><mxfile host="test">${diagrams}</mxfile>`;
}

async function createPdfBytes(pageCount: number, label: string): Promise<Uint8Array> {
    const document = await PDFDocument.create();
    for (let index = 0; index < pageCount; index++) {
        const page = document.addPage([200, 100]);
        page.drawText(`${label} ${index + 1}`, { x: 10, y: 45, size: 12 });
    }
    return document.save();
}

async function readPdfPageCount(filePath: string): Promise<number> {
    const document = await PDFDocument.load(await readFile(filePath));
    return document.getPageCount();
}

async function listFiles(root: string, relative = ''): Promise<string[]> {
    const entries = await readdir(path.join(root, relative), { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
        const entryPath = path.join(relative, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await listFiles(root, entryPath)));
        } else {
            files.push(entryPath);
        }
    }
    return files.toSorted();
}

/**
 * Replaces the external process boundary. Draw.io invocations write deterministic
 * XML/PDF artifacts to the requested output path; pdfcrop is a no-op.
 */
function installExecStub(options: ExecStubOptions): SinonStub {
    const sourceByExtractedPath = new Map<string, string>();
    const execFileStub = stub(execFileUtils, 'execFileInWorkspace');

    execFileStub.callsFake(async (command: string, args: string[]): Promise<string> => {
        const failure = options.failPhase;

        if (command === 'pdfcrop') {
            if (failure?.phase === 'crop') {
                throw failure.error;
            }
            return '';
        }

        const outputIndex = args.indexOf('-o');
        assert.ok(outputIndex > 0, `Expected an -o argument in: ${args.join(' ')}`);
        const outputPath = args[outputIndex + 1];

        if (args[0] === '-x') {
            if (failure?.phase === 'xml') {
                throw failure.error;
            }
            sourceByExtractedPath.set(outputPath, args[args.length - 1]);
            await writeFile(outputPath, options.editableImageXml ?? createDrawioXml(['tab']));
            return '';
        }

        const conversionInputPath = args[0];
        const sourcePath = sourceByExtractedPath.get(conversionInputPath) ?? conversionInputPath;
        const pageCount = options.pageCountBySource?.get(sourcePath) ?? 1;
        await writeFile(outputPath, await createPdfBytes(pageCount, path.basename(sourcePath)));

        if (options.afterPdfExport) {
            await options.afterPdfExport({ sourcePath, outputPath });
        }
        if (failure?.phase === 'pdf') {
            throw failure.error;
        }
        return '';
    });

    return execFileStub;
}

suite('convert_drawio_to_pdf テストスイート', () => {
    let directory: string;
    let workspaceFolder: vscode.WorkspaceFolder;
    let appConfig: AppConfig;

    const filePath = (...segments: string[]) => path.join(directory, ...segments);

    setup(async () => {
        directory = await mkdtemp(path.join(os.tmpdir(), 'latex-graphics-helper-drawio-'));
        workspaceFolder = {
            uri: vscode.Uri.file(directory),
            name: 'drawio-test-workspace',
            index: 0,
        };
        appConfig = {
            execPathDrawio: 'drawio' as ExecutablePath,
            execPathPdfcrop: 'pdfcrop' as ExecutablePath,
        } as AppConfig;
    });

    teardown(async () => {
        restore();
        await rm(directory, { recursive: true, force: true });
    });

    test('Draw.ioファイルを同じディレクトリ内のタブごとに1つのPDFへ変換する', async () => {
        const inputPath = filePath('diagram.drawio');
        await writeFile(inputPath, createDrawioXml(['tab-a', 'tab-b']));
        const execFileStub = installExecStub({
            pageCountBySource: new Map([[inputPath, 2]]),
        });
        const outputTemplatePath =
            '${fileDirname}/${fileBasenameNoExtension}/${page}.pdf' as PdfTemplatePath;

        const outputPaths = await convertDrawioToPdf(
            appConfig,
            inputPath as DrawioPath,
            outputTemplatePath,
            workspaceFolder,
        );

        assert.deepStrictEqual(outputPaths, [
            filePath('diagram', 'tab-a.pdf'),
            filePath('diagram', 'tab-b.pdf'),
        ]);
        assert.strictEqual(await readPdfPageCount(outputPaths[0]), 1);
        assert.strictEqual(await readPdfPageCount(outputPaths[1]), 1);

        const drawioCalls = execFileStub.getCalls().filter((call) => call.args[0] === 'drawio');
        assert.strictEqual(drawioCalls.length, 1);
        const exportArgs = drawioCalls[0].args[1];
        assert.strictEqual(exportArgs[0], inputPath);
        assert.strictEqual(exportArgs[1], '-o');
        assert.deepStrictEqual(exportArgs.slice(3), ['-x', '-f', 'pdf', '-t', '-a', '--crop']);
        assert.strictEqual(path.dirname(exportArgs[2]), directory);

        assert.deepStrictEqual(
            await listFiles(directory),
            [
                'diagram.drawio',
                path.join('diagram', 'tab-a.pdf'),
                path.join('diagram', 'tab-b.pdf'),
            ].toSorted(),
        );
    });

    test('編集可能な画像を抽出し、すべての一時ファイルを削除する', async () => {
        const inputPath = filePath('diagram.drawio.png');
        await writeFile(inputPath, 'not-a-real-png');
        const execFileStub = installExecStub({
            editableImageXml: createDrawioXml(['first', 'second']),
            pageCountBySource: new Map([[inputPath, 2]]),
        });
        const outputTemplatePath =
            '${fileDirname}/${fileBasenameNoExtension}-${page}.pdf' as PdfTemplatePath;

        const outputPaths = await convertDrawioToPdf(
            appConfig,
            inputPath as DrawioPath,
            outputTemplatePath,
            workspaceFolder,
        );

        assert.deepStrictEqual(outputPaths, [
            filePath('diagram-first.pdf'),
            filePath('diagram-second.pdf'),
        ]);
        assert.strictEqual(await readPdfPageCount(outputPaths[0]), 1);
        assert.strictEqual(await readPdfPageCount(outputPaths[1]), 1);

        const drawioCalls = execFileStub.getCalls().filter((call) => call.args[0] === 'drawio');
        assert.strictEqual(drawioCalls.length, 2);
        const xmlArgs = drawioCalls[0].args[1];
        assert.deepStrictEqual(xmlArgs.slice(0, 3), ['-x', '-f', 'xml']);
        assert.strictEqual(xmlArgs[3], '-o');
        assert.strictEqual(path.dirname(xmlArgs[4]), directory);
        assert.strictEqual(path.extname(xmlArgs[4]), '.drawio');
        assert.strictEqual(xmlArgs[5], inputPath);
        assert.deepStrictEqual(drawioCalls[0].args[3], { allowStderr: true });

        const pdfExportArgs = drawioCalls[1].args[1];
        assert.strictEqual(pdfExportArgs[0], xmlArgs[4]);
        assert.strictEqual(pdfExportArgs[1], '-o');
        assert.deepStrictEqual(pdfExportArgs.slice(3), ['-x', '-f', 'pdf', '-t', '-a', '--crop']);
        assert.strictEqual(path.dirname(pdfExportArgs[2]), directory);
        assert.strictEqual(path.extname(pdfExportArgs[2]), '.pdf');
        assert.deepStrictEqual(drawioCalls[1].args[3], { allowStderr: true });

        assert.deepStrictEqual(
            await listFiles(directory),
            ['diagram.drawio.png', 'diagram-first.pdf', 'diagram-second.pdf'].toSorted(),
        );
    });

    test('Draw.ioファイルと同じベース名の既存PDFを保持する', async () => {
        const inputPath = filePath('diagram.drawio');
        await writeFile(inputPath, createDrawioXml(['tab']));
        const existingPdfPath = filePath('diagram.pdf');
        const existingPdfBytes = await createPdfBytes(3, 'existing');
        await writeFile(existingPdfPath, existingPdfBytes);
        installExecStub({ pageCountBySource: new Map([[inputPath, 1]]) });

        const outputPaths = await convertDrawioToPdf(
            appConfig,
            inputPath as DrawioPath,
            '${fileDirname}/converted-${page}.pdf' as PdfTemplatePath,
            workspaceFolder,
        );

        assert.deepStrictEqual(outputPaths, [filePath('converted-tab.pdf')]);
        assert.strictEqual(await readPdfPageCount(outputPaths[0]), 1);
        assert.deepStrictEqual(await readFile(existingPdfPath), Buffer.from(existingPdfBytes));
        assert.deepStrictEqual(
            await listFiles(directory),
            ['diagram.drawio', 'diagram.pdf', 'converted-tab.pdf'].toSorted(),
        );
    });

    test('編集可能な画像で固定の抽出名とPDF名に既存ファイルがある場合は保持する', async () => {
        const inputPath = filePath('diagram.drawio.png');
        await writeFile(inputPath, 'not-a-real-png');
        const existingXmlPath = `${inputPath}.drawio`;
        const existingXml = createDrawioXml(['user-tab']);
        await writeFile(existingXmlPath, existingXml);
        const existingPdfPath = filePath('diagram.pdf');
        const existingPdfBytes = await createPdfBytes(2, 'existing');
        await writeFile(existingPdfPath, existingPdfBytes);
        installExecStub({
            editableImageXml: createDrawioXml(['tab']),
            pageCountBySource: new Map([[inputPath, 1]]),
        });

        const outputPaths = await convertDrawioToPdf(
            appConfig,
            inputPath as DrawioPath,
            '${fileDirname}/image-${page}.pdf' as PdfTemplatePath,
            workspaceFolder,
        );

        assert.deepStrictEqual(outputPaths, [filePath('image-tab.pdf')]);
        assert.strictEqual(await readPdfPageCount(outputPaths[0]), 1);
        assert.strictEqual(await readFile(existingXmlPath, 'utf8'), existingXml);
        assert.deepStrictEqual(await readFile(existingPdfPath), Buffer.from(existingPdfBytes));
        assert.deepStrictEqual(
            await listFiles(directory),
            [
                'diagram.drawio.png',
                'diagram.drawio.png.drawio',
                'diagram.pdf',
                'image-tab.pdf',
            ].toSorted(),
        );
    });

    test('Draw.ioのエクスポートに失敗したとき、自身の一時PDFのみを削除する', async () => {
        const inputPath = filePath('diagram.drawio');
        await writeFile(inputPath, createDrawioXml(['tab']));
        const existingPdfPath = filePath('diagram.pdf');
        const existingPdfBytes = await createPdfBytes(4, 'existing');
        await writeFile(existingPdfPath, existingPdfBytes);
        const failure = new Error('drawio export failed');
        installExecStub({
            pageCountBySource: new Map([[inputPath, 1]]),
            failPhase: { phase: 'pdf', error: failure },
        });

        await assert.rejects(
            convertDrawioToPdf(
                appConfig,
                inputPath as DrawioPath,
                '${fileDirname}/out-${page}.pdf' as PdfTemplatePath,
                workspaceFolder,
            ),
            (error: unknown) => {
                assert.strictEqual(error, failure);
                return true;
            },
        );

        assert.deepStrictEqual(await readFile(existingPdfPath), Buffer.from(existingPdfBytes));
        assert.deepStrictEqual(await listFiles(directory), ['diagram.drawio', 'diagram.pdf']);
    });

    test('PDFのエクスポートに失敗したとき、抽出したXMLと一時PDFを削除する', async () => {
        const inputPath = filePath('diagram.drawio.png');
        await writeFile(inputPath, 'not-a-real-png');
        const failure = new Error('pdf export failed');
        installExecStub({
            editableImageXml: createDrawioXml(['tab']),
            pageCountBySource: new Map([[inputPath, 1]]),
            failPhase: { phase: 'pdf', error: failure },
        });

        await assert.rejects(
            convertDrawioToPdf(
                appConfig,
                inputPath as DrawioPath,
                '${fileDirname}/out-${page}.pdf' as PdfTemplatePath,
                workspaceFolder,
            ),
            (error: unknown) => {
                assert.strictEqual(error, failure);
                return true;
            },
        );

        assert.deepStrictEqual(await listFiles(directory), ['diagram.drawio.png']);
    });

    test('pdfcrop に失敗したときも抽出 XML と一時 PDF を削除し、既存ファイルは保持する', async () => {
        const inputPath = filePath('diagram.drawio.png');
        await writeFile(inputPath, 'not-a-real-png');
        const existingPdfPath = filePath('diagram.pdf');
        const existingPdfBytes = await createPdfBytes(2, 'existing');
        await writeFile(existingPdfPath, existingPdfBytes);
        const failure = new Error('pdfcrop failed');
        installExecStub({
            editableImageXml: createDrawioXml(['tab']),
            pageCountBySource: new Map([[inputPath, 1]]),
            failPhase: { phase: 'crop', error: failure },
        });

        await assert.rejects(
            convertDrawioToPdf(
                appConfig,
                inputPath as DrawioPath,
                '${fileDirname}/out-${page}.pdf' as PdfTemplatePath,
                workspaceFolder,
            ),
            (error: unknown) => {
                assert.strictEqual(error, failure);
                return true;
            },
        );

        assert.deepStrictEqual(await readFile(existingPdfPath), Buffer.from(existingPdfBytes));
        assert.deepStrictEqual(await listFiles(directory), ['diagram.drawio.png', 'diagram.pdf']);
    });

    test('ベース名が異なるファイルを同時に変換する', async () => {
        const firstInputPath = filePath('alpha.drawio');
        const secondInputPath = filePath('beta.drawio');
        await writeFile(firstInputPath, createDrawioXml(['a1', 'a2']));
        await writeFile(secondInputPath, createDrawioXml(['b1']));
        installExecStub({
            pageCountBySource: new Map([
                [firstInputPath, 2],
                [secondInputPath, 1],
            ]),
        });
        const outputTemplatePath =
            '${fileDirname}/${fileBasenameNoExtension}-${page}.pdf' as PdfTemplatePath;

        const [firstOutputs, secondOutputs] = await Promise.all([
            convertDrawioToPdf(
                appConfig,
                firstInputPath as DrawioPath,
                outputTemplatePath,
                workspaceFolder,
            ),
            convertDrawioToPdf(
                appConfig,
                secondInputPath as DrawioPath,
                outputTemplatePath,
                workspaceFolder,
            ),
        ]);

        assert.deepStrictEqual(firstOutputs, [filePath('alpha-a1.pdf'), filePath('alpha-a2.pdf')]);
        assert.deepStrictEqual(secondOutputs, [filePath('beta-b1.pdf')]);
        assert.deepStrictEqual(
            await listFiles(directory),
            [
                'alpha.drawio',
                'alpha-a1.pdf',
                'alpha-a2.pdf',
                'beta.drawio',
                'beta-b1.pdf',
            ].toSorted(),
        );
    });

    test('同じベース名を共有する同時変換を互いに分離する', async () => {
        const drawioInputPath = filePath('diagram.drawio');
        const imageInputPath = filePath('diagram.drawio.png');
        await writeFile(drawioInputPath, createDrawioXml(['source-a', 'source-b']));
        await writeFile(imageInputPath, 'not-a-real-png');

        // Both exports write before either conversion continues, so the shared
        // base name overlaps deterministically instead of relying on timing.
        const pdfExportEvents = new EventEmitter();
        const pdfExportsReached = once(pdfExportEvents, 'all-written');
        const expectedPdfExports = 2;
        let pdfExportCount = 0;

        installExecStub({
            editableImageXml: createDrawioXml(['image-tab']),
            pageCountBySource: new Map([
                [drawioInputPath, 2],
                [imageInputPath, 1],
            ]),
            afterPdfExport: async () => {
                pdfExportCount++;
                if (pdfExportCount === expectedPdfExports) {
                    pdfExportEvents.emit('all-written');
                }
                await pdfExportsReached;
            },
        });

        const [drawioOutputs, imageOutputs] = await Promise.all([
            convertDrawioToPdf(
                appConfig,
                drawioInputPath as DrawioPath,
                '${fileDirname}/from-drawio-${page}.pdf' as PdfTemplatePath,
                workspaceFolder,
            ),
            convertDrawioToPdf(
                appConfig,
                imageInputPath as DrawioPath,
                '${fileDirname}/from-image-${page}.pdf' as PdfTemplatePath,
                workspaceFolder,
            ),
        ]);

        assert.deepStrictEqual(drawioOutputs, [
            filePath('from-drawio-source-a.pdf'),
            filePath('from-drawio-source-b.pdf'),
        ]);
        assert.deepStrictEqual(imageOutputs, [filePath('from-image-image-tab.pdf')]);
        assert.deepStrictEqual(
            await listFiles(directory),
            [
                'diagram.drawio',
                'diagram.drawio.png',
                'from-drawio-source-a.pdf',
                'from-drawio-source-b.pdf',
                'from-image-image-tab.pdf',
            ].toSorted(),
        );
    });
});
