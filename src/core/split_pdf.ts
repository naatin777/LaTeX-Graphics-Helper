import { PDFDocument } from 'pdf-lib';
import * as vscode from 'vscode';

import { PdfPath, PdfTemplatePath } from '../type';
import { createFolder, generatePathFromTemplate } from '../utils';

export async function splitPdf(
    inputPath: PdfPath,
    outputTemplatePath: PdfTemplatePath,
    workspaceFolder: vscode.WorkspaceFolder,
    pages: string[] = [],
): Promise<PdfPath[]> {
    const pdfBuffer = await vscode.workspace.fs.readFile(vscode.Uri.file(inputPath));
    const pdfDocument = await PDFDocument.load(pdfBuffer);
    const pdfPages = pdfDocument.getPages();

    const outputPaths: PdfPath[] = [];

    for (let i = 0; i < pdfPages.length; i++) {
        const outputPath = generatePathFromTemplate(outputTemplatePath, inputPath, workspaceFolder, pages[i] ?? (i + 1).toString()) as PdfPath;
        outputPaths.push(outputPath);
        await createFolder(outputPath);

        const newPdfDocument = await PDFDocument.create();
        const [copiedPdfPage] = await newPdfDocument.copyPages(pdfDocument, [i]);
        newPdfDocument.addPage(copiedPdfPage);
        const newPdfBytes = await newPdfDocument.save();
        await vscode.workspace.fs.writeFile(vscode.Uri.file(outputPath), newPdfBytes);
    }

    return outputPaths;
}
