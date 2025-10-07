import { PDFDocument } from 'pdf-lib';
import * as vscode from 'vscode';

import { BitmapPath, BitmapType, PdfPath, PdfTemplatePath } from '../type';
import { generatePathFromTemplate } from '../utils';

export async function convertBitmapToPdf(
    inputPath: BitmapPath,
    outputTemplatePath: PdfTemplatePath,
    workspaceFolder: vscode.WorkspaceFolder,
    type: BitmapType
): Promise<PdfPath> {
    const replacedOutputPath = generatePathFromTemplate(outputTemplatePath, inputPath, workspaceFolder);
    const pdfDoc = await PDFDocument.create();
    const imageBytes = await vscode.workspace.fs.readFile(vscode.Uri.file(inputPath));
    const image = type === 'jpeg' ? await pdfDoc.embedJpg(imageBytes) : await pdfDoc.embedPng(imageBytes);
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    const pdfBytes = await pdfDoc.save();
    await vscode.workspace.fs.writeFile(vscode.Uri.file(replacedOutputPath), pdfBytes);
    return replacedOutputPath as PdfPath;
}
