import * as assert from 'node:assert';
import { chmod, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { PDFDocument } from 'pdf-lib';
import { restore, stub } from 'sinon';
import * as vscode from 'vscode';

import type { AppConfig } from '../../configuration';
import {
    convertPdfToPng,
    convertPdfToJpeg,
    convertPdfToSvg,
} from '../../core/convert_pdf_to_image';
import type { PdfPath, PngTemplatePath, JpegTemplatePath, SvgTemplatePath } from '../../type';
import * as exec from '../../utils/exec_file_in_workspace';

suite('PDF画像変換の安全性', () => {
    let dir: string;
    let input: PdfPath;
    let workspace: vscode.WorkspaceFolder;
    const config = { execPathPdftocairo: 'pdftocairo' } as AppConfig;
    setup(async () => {
        dir = await mkdtemp(path.join(os.tmpdir(), 'lgh-image-'));
        workspace = { uri: vscode.Uri.file(dir), name: 'workspace', index: 0 };
        input = path.join(dir, '日本語 source.pdf') as PdfPath;
        const pdf = await PDFDocument.create();
        pdf.addPage();
        await writeFile(input, await pdf.save());
    });
    teardown(async () => {
        restore();
        await rm(dir, { recursive: true, force: true });
    });
    test('読み取り専用のソースディレクトリから書き込み可能な出力ディレクトリへ変換する', async function () {
        if (process.platform === 'win32' || (process.getuid && process.getuid() === 0)) {
            this.skip();
        }
        const sourceDir = path.join(dir, 'source');
        const outputDir = path.join(dir, 'output');
        await mkdir(sourceDir);
        await mkdir(outputDir);
        const source = path.join(sourceDir, 'source.pdf') as PdfPath;
        await rename(input, source);
        const output = path.join(outputDir, 'image.svg') as SvgTemplatePath;
        const execStub = stub(exec, 'execFileInWorkspace').callsFake(async (_command, args) => {
            await writeFile(args[1], '<svg/>');
            return '';
        });
        await chmod(sourceDir, 0o555);
        try {
            assert.deepStrictEqual(await convertPdfToSvg(config, source, output, workspace), [
                output,
            ]);
            assert.strictEqual(await readFile(output, 'utf8'), '<svg/>');
            assert.deepStrictEqual(execStub.firstCall.args[3], { allowStderr: true });
        } finally {
            await chmod(sourceDir, 0o755);
        }
    });
    for (const format of ['png', 'jpeg', 'svg'] as const) {
        test(`${format}: 既存の中間ファイルを保護し、失敗後に後始末する`, async () => {
            const output = path.join(dir, `image.${format}`);
            const intermediate = output + '.pdf';
            await writeFile(intermediate, 'preserve');
            const before = await readFile(input);
            stub(exec, 'execFileInWorkspace').callsFake(async (_command, args) => {
                await writeFile(
                    args[1] + (format === 'png' ? '.png' : format === 'jpeg' ? '.jpg' : ''),
                    'partial',
                );
                throw new Error('conversion failed');
            });
            const convert =
                format === 'png'
                    ? () => convertPdfToPng(config, input, output as PngTemplatePath, workspace)
                    : format === 'jpeg'
                      ? () => convertPdfToJpeg(config, input, output as JpegTemplatePath, workspace)
                      : () => convertPdfToSvg(config, input, output as SvgTemplatePath, workspace);
            await assert.rejects(convert(), /conversion failed/);
            assert.strictEqual(await readFile(intermediate, 'utf8'), 'preserve');
            assert.deepStrictEqual(await readFile(input), before);
            assert.deepStrictEqual(
                (await readdir(dir)).toSorted(),
                ['日本語 source.pdf', `image.${format}.pdf`].toSorted(),
            );
        });
    }
});
