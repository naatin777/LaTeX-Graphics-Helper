import { PDFDocument } from 'pdf-lib';
import * as vscode from 'vscode';

import { BitmapPath, PdfTemplatePath } from '../type';
import { generatePathFromTemplate } from '../utils';

export async function convertBitmapToPdf(inputPath: BitmapPath, outputTemplatePath: PdfTemplatePath, workspaceFolder: vscode.WorkspaceFolder) {
    const replacedOutputPath = generatePathFromTemplate(outputTemplatePath, inputPath, workspaceFolder);

    const pdfDoc = await PDFDocument.create();

    const imageBytes = await vscode.workspace.fs.readFile(vscode.Uri.file(inputPath));

    let image;
    if (inputPath.toLowerCase().endsWith('.png')) {
        image = await pdfDoc.embedPng(imageBytes);
    } else if (inputPath.toLowerCase().endsWith('.jpg') || inputPath.toLowerCase().endsWith('.jpeg')) {
        image = await pdfDoc.embedJpg(imageBytes);
    }

    if (!image) {
        return;
    }

    const page = pdfDoc.addPage([image.width, image.height]);

    page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
    });

    const pdfBytes = await pdfDoc.save();
    await vscode.workspace.fs.writeFile(vscode.Uri.file(replacedOutputPath), pdfBytes);
}
