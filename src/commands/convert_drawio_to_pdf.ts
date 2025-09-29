import { execFileSync } from 'child_process';
import * as fs from 'fs';

import { PDFDocument } from 'pdf-lib';
import * as vscode from 'vscode';
import { Parser } from 'xml2js';

import { AppConfig, getAppConfig } from '../configuration';
import { localeMap } from '../locale_map';
import { runExplorerContextItem } from '../run_context_menu_item';
import { createFolder, replaceOutputPath } from '../utils';

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

    const replacedOutputPath = replaceOutputPath(uri.fsPath, temporaryPdfPath, workspaceFolder);
    createFolder(replacedOutputPath);
    execFileSync(config.execPathDrawio, [uri.fsPath, '-o', replacedOutputPath, '-xf', 'pdf', '-t', '-a'], { cwd: workspaceFolder.uri.fsPath });
    execFileSync(config.execPathPdfcrop, [temporaryPdfPath, temporaryPdfPath], { cwd: workspaceFolder.uri.fsPath });

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

export function runConvertDrawioToPdfCommand(uri: vscode.Uri, uris?: vscode.Uri[]) {
    if (!uris || uris.length === 0) {
        vscode.window.showErrorMessage(localeMap('noFilesSelected'));
        return;
    }

    runExplorerContextItem(uris, localeMap('convertDrawioToPdfProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
        convertDrawioToPdf(uri, workspaceFolder, getAppConfig());
    });
}
