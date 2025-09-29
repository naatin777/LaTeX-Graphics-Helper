import * as fs from 'fs';

import { PDFDocument } from 'pdf-lib';
import * as vscode from 'vscode';

import { getAppConfig } from '../configuration';
import { localeMap } from '../locale_map';
import { runExplorerContextItem } from '../run_context_menu_item';
import { createFolder, replaceOutputPath } from '../utils';

export async function splitPdf(
    inputPath: string,
    outputPath: string,
    workspaceFolder: vscode.WorkspaceFolder,
    tabs: string[] = [],
): Promise<string[]> {
    const pdfBuffer = fs.readFileSync(inputPath);
    const pdfDocument = await PDFDocument.load(pdfBuffer);
    const pdfPages = pdfDocument.getPages();

    const outputPaths: string[] = [];

    for (let i = 0; i < pdfPages.length; i++) {
        const replacedOutputPath = replaceOutputPath(inputPath, outputPath, workspaceFolder, tabs[i] ?? (i + 1).toString());
        outputPaths.push(replacedOutputPath);
        createFolder(replacedOutputPath);

        const newPdfDocument = await PDFDocument.create();
        const [copiedPdfPage] = await newPdfDocument.copyPages(pdfDocument, [i]);
        newPdfDocument.addPage(copiedPdfPage);
        const newPdfBytes = await newPdfDocument.save();
        fs.writeFileSync(replacedOutputPath, newPdfBytes);
    }

    return outputPaths;
}

export function runSplitPdfCommand(uri: vscode.Uri, uris?: vscode.Uri[]) {
    if (!uris || uris.length === 0) {
        vscode.window.showErrorMessage(localeMap('noFilesSelected'));
        return;
    }

    runExplorerContextItem(uris, localeMap('splitPdfProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
        splitPdf(uri.fsPath, getAppConfig().outputPathSplitPdf, workspaceFolder);
    });
}
