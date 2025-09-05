import * as fs from 'fs/promises';

import { PDFDocument } from 'pdf-lib';

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
