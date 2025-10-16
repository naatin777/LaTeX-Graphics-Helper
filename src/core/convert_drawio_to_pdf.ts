import path from 'path';

import * as vscode from 'vscode';
import { Parser } from 'xml2js';

import { AppConfig } from '../configuration';
import { DrawioPath, PdfPath, PdfTemplatePath } from '../type';
import { execFileInWorkspace } from '../utils/exec_file_in_workspace';

import { cropPdf } from './crop_pdf';
import { splitPdf } from './split_pdf';

async function getDrawioTabs(inputPath: DrawioPath): Promise<string[]> {
    const xmlData = await vscode.workspace.fs.readFile(vscode.Uri.file(inputPath));
    const parser = new Parser();
    const result = await parser.parseStringPromise(xmlData.toString());
    const diagrams = result.mxfile.diagram;
    return diagrams.map((diagram: any) => diagram.$.name);
}

export async function convertDrawioToPdf(
    appConfig: AppConfig,
    inputPath: DrawioPath,
    outputTemplatePath: PdfTemplatePath,
    workspaceFolder: vscode.WorkspaceFolder,
): Promise<PdfPath[]> {
    const parsedPath = path.parse(inputPath);
    const temporaryPdfPath = `${path.join(parsedPath.dir, parsedPath.name)}.pdf` as PdfPath;
    await execFileInWorkspace(
        appConfig.execPathDrawio,
        [inputPath, '-o', temporaryPdfPath, '-xf', 'pdf', '-t', '-a'],
        workspaceFolder
    );
    await cropPdf(
        appConfig,
        temporaryPdfPath,
        temporaryPdfPath,
        workspaceFolder
    );
    const drawioTabs = await getDrawioTabs(inputPath);
    const outputPaths = await splitPdf(
        temporaryPdfPath,
        outputTemplatePath,
        workspaceFolder,
        drawioTabs,
    );
    await vscode.workspace.fs.delete(vscode.Uri.file(temporaryPdfPath), { recursive: true, useTrash: false });
    return outputPaths;
}
