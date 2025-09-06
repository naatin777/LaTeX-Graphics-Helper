import * as fs from 'fs';

import { PDFDocument } from 'pdf-lib';
import * as vscode from 'vscode';

import { createFolder, replaceOutputPath } from '../utils';

export async function splitPdf(
    inputPath: string,
    outputPath: string,
    workspaceFolder: vscode.WorkspaceFolder,
    tabs: string[] = [],
): Promise<string[]> {
    const pdfBuffer = fs.readFileSync(inputPath);
    const pdfDocument = await PDFDocument.load(pdfBuffer);
    const pdfPages = pdfDocument.getPages();

    const outputPaths: string[] = [];

    for (let i = 0; i < pdfPages.length; i++) {
        const replacedOutputPath = replaceOutputPath(inputPath, outputPath, workspaceFolder, tabs[i] ?? (i + 1).toString());
        outputPaths.push(replacedOutputPath);
        createFolder(replacedOutputPath);

        const newPdfDocument = await PDFDocument.create();
        const [copiedPdfPage] = await newPdfDocument.copyPages(pdfDocument, [i]);
        newPdfDocument.addPage(copiedPdfPage);
        const newPdfBytes = await newPdfDocument.save();
        fs.writeFileSync(replacedOutputPath, newPdfBytes);
    }

    return outputPaths;
}
