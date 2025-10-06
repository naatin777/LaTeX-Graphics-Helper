import { PDFDocument } from 'pdf-lib';
import * as vscode from 'vscode';

import { PdfTemplatePath } from '../type';
import { replaceOutputPath } from '../utils';

export async function convertBitmapToPdf(uri: vscode.Uri, outputPath: PdfTemplatePath, workspaceFolder: vscode.WorkspaceFolder) {
    const replacedOutputPath = replaceOutputPath(uri.fsPath, outputPath, workspaceFolder);

    const pdfDoc = await PDFDocument.create();

    const imageBytes = await vscode.workspace.fs.readFile(uri);

    let image;
    if (uri.fsPath.toLowerCase().endsWith('.png')) {
        image = await pdfDoc.embedPng(imageBytes);
    } else if (uri.fsPath.toLowerCase().endsWith('.jpg') || uri.fsPath.toLowerCase().endsWith('.jpeg')) {
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
