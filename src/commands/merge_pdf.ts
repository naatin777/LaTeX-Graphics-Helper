import * as fs from 'fs/promises';

import { PDFDocument } from 'pdf-lib';
import * as vscode from 'vscode';

import { localeMap } from '../locale_map';

export async function mergePdf(
    inputPaths: string[],
    outputPath: string,
): Promise<void> {
    const mergedPdf = await PDFDocument.create();

    for (const inputPath of inputPaths) {
        const pdfBytes = await fs.readFile(inputPath);
        const pdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();
    await fs.writeFile(outputPath, mergedPdfBytes);
}

export async function runMergePdfCommand(uri: vscode.Uri, uris?: vscode.Uri[]) {
    try {
        if (!uris) {
            throw new Error(localeMap('noFilesSelected'));
        }
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: localeMap('mergePdfProcess'),
            cancellable: false
        }, async (progress) => {
            const outputPath = await vscode.window.showSaveDialog({
                filters: {
                    'PDF': ['pdf']
                },
            });
            const inputPaths = uris.map((uri) => uri.fsPath);
            if (outputPath) {
                await mergePdf(inputPaths, outputPath.fsPath);
            }
        });
    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`${error.message}`);
        }
    }
}
