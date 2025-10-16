import { PDFDocument } from 'pdf-lib';
import * as vscode from 'vscode';

import { PdfPath } from '../type';

export async function mergePdf(
    inputPaths: PdfPath[],
    outputPath: PdfPath,
): Promise<void> {
    const mergedPdf = await PDFDocument.create();

    for (const inputPath of inputPaths) {
        const pdfBytes = await vscode.workspace.fs.readFile(vscode.Uri.file(inputPath));
        const pdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();
    await vscode.workspace.fs.writeFile(vscode.Uri.file(outputPath), mergedPdfBytes);
}
