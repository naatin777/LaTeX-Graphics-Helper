import { PDFDocument } from 'pdf-lib';
import * as vscode from 'vscode';

import type { PdfPath, PdfTemplatePath } from '../type';
import { createFolder } from '../utils/create_folder';
import { generatePathFromTemplate } from '../utils/generate_path_from_template';

/**
 * Splits a PDF into one file per page.
 *
 * `inputPath` is the file that is read. `templateSourcePath` is used only to
 * expand template variables in `outputTemplatePath`; they differ when the PDF
 * being split is a temporary file (e.g. Draw.io conversion), so output names
 * still derive from the user's original file.
 */
export async function splitPdf(
    inputPath: PdfPath,
    outputTemplatePath: PdfTemplatePath,
    workspaceFolder: vscode.WorkspaceFolder,
    pages: string[] = [],
    templateSourcePath: PdfPath = inputPath,
): Promise<PdfPath[]> {
    const pdfBuffer = await vscode.workspace.fs.readFile(vscode.Uri.file(inputPath));
    const pdfDocument = await PDFDocument.load(pdfBuffer);
    const pdfPages = pdfDocument.getPages();

    const outputPaths: PdfPath[] = [];

    for (let i = 0; i < pdfPages.length; i++) {
        const outputPath = generatePathFromTemplate(
            outputTemplatePath,
            templateSourcePath,
            workspaceFolder,
            pages[i] ?? (i + 1).toString(),
        );
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
