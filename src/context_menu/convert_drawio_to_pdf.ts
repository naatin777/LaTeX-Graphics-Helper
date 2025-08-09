import * as fs from 'fs';
import * as path from 'path';

import { PDFDocument } from 'pdf-lib';
import * as vscode from 'vscode';
import { Parser } from 'xml2js';

import { getExecPathDrawio } from '../configuration';
import { createFolder, replaceOutputPath, runCommand } from '../utils';

import { cropPdf } from './crop_pdf';

async function getDrawioTabs(inputPath: string): Promise<string[]> {
    const xmlData = fs.readFileSync(inputPath, 'utf-8');
    const parser = new Parser();
    const result = await parser.parseStringPromise(xmlData);
    const diagrams = result.mxfile.diagram;
    return diagrams.map((diagram: any) => diagram.$.name);
}

async function savePdfFile(pdfDocument: PDFDocument, outputPath: string, i: number) {
    const newPdfDocument = await PDFDocument.create();
    const [copiedPdfPage] = await newPdfDocument.copyPages(pdfDocument, [i]);
    newPdfDocument.addPage(copiedPdfPage);
    const newPdfBytes = await newPdfDocument.save();
    fs.writeFileSync(outputPath, newPdfBytes);
}

export async function convertDrawioToPdf(
    inputPath: string,
    outputPath: string,
    workspaceFolder: vscode.WorkspaceFolder,
): Promise<void> {
    const temporaryPdfPath = `${inputPath}.pdf`;

    runCommand(
        `${getExecPathDrawio()} -xf pdf -t -a -o "${path.normalize(temporaryPdfPath)}" "${path.normalize(inputPath)}"`,
        workspaceFolder
    );
    cropPdf(temporaryPdfPath, temporaryPdfPath, workspaceFolder);

    const drawioTabs = await getDrawioTabs(inputPath);

    const pdfBuffer = fs.readFileSync(temporaryPdfPath);
    const pdfDocument = await PDFDocument.load(pdfBuffer);
    const pdfPages = pdfDocument.getPages();

    for (let i = 0; i < pdfPages.length; i++) {
        const tab = drawioTabs[i];

        const replacedOutputPath = `${replaceOutputPath(inputPath, outputPath, workspaceFolder, tab)}.pdf`;
        createFolder(replacedOutputPath);

        savePdfFile(pdfDocument, replacedOutputPath, i);
    }

    fs.unlinkSync(temporaryPdfPath);
}
