import * as fs from 'fs';

import { PDFDocument } from 'pdf-lib';
import * as vscode from 'vscode';
import { Parser } from 'xml2js';

import { AppConfig } from '../configuration';
import { createFolder, replaceOutputPath, runCommand } from '../utils';

import { createCropPdfCommand } from './crop_pdf';

export function createConvertDrawioToPdfCommand(
    execPath: string,
    inputPath: string,
    outputPath: string,
    workspaceFolder: vscode.WorkspaceFolder,
): string {
    const replacedOutputPath = replaceOutputPath(inputPath, outputPath, workspaceFolder);
    createFolder(replacedOutputPath);

    return `${execPath} "${inputPath}" -o "${replacedOutputPath}" -xf pdf -t -a`;
}

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
    uri: vscode.Uri,
    workspaceFolder: vscode.WorkspaceFolder,
    config: AppConfig,
) {
    const temporaryPdfPath = `${uri.fsPath}.pdf`;

    const convertDrawioToPdfCommand = createConvertDrawioToPdfCommand(config.execPathDrawio, uri.fsPath, temporaryPdfPath, workspaceFolder);
    runCommand(convertDrawioToPdfCommand, workspaceFolder);

    const cropPdfCommand = createCropPdfCommand(config.execPathPdfcrop, temporaryPdfPath, temporaryPdfPath);
    runCommand(cropPdfCommand, workspaceFolder);

    const drawioTabs = await getDrawioTabs(uri.fsPath);

    const pdfBuffer = fs.readFileSync(temporaryPdfPath);
    const pdfDocument = await PDFDocument.load(pdfBuffer);
    const pdfPages = pdfDocument.getPages();

    for (let i = 0; i < pdfPages.length; i++) {
        const tab = drawioTabs[i];

        const replacedOutputPath = replaceOutputPath(uri.fsPath, config.outputPathConvertDrawioToPdf, workspaceFolder, tab);
        createFolder(replacedOutputPath);

        savePdfFile(pdfDocument, replacedOutputPath, i);
    }

    fs.unlinkSync(temporaryPdfPath);
}
