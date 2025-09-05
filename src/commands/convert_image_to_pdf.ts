import * as vscode from 'vscode';

import { getExecPathInkscape } from '../configuration';
import { PdfOutputPath } from '../type';
import { createFolder, replaceOutputPath, runCommand } from '../utils';

export function createConvertImageToPdfCommand(
    execPath: string,
    inputPath: string,
    outputPath: string,
): string {
    return `${execPath} "${inputPath}" -o "${outputPath}" --export-type=pdf --export-area-drawing`;
}

export function convertImageToPdf(uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder, outputPath: PdfOutputPath) {
    const replacedOutputPath = replaceOutputPath(uri.fsPath, outputPath, workspaceFolder);
    createFolder(replacedOutputPath);
    const convertImageToPdfCommand = createConvertImageToPdfCommand(getExecPathInkscape(), uri.fsPath, replacedOutputPath);
    runCommand(convertImageToPdfCommand, workspaceFolder);
}
