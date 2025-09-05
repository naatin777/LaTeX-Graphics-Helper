import * as vscode from 'vscode';

import { getExecPathInkscape } from '../configuration';
import { createFolder, replaceOutputPath, runCommand } from '../utils';

export function createConvertImageToPdfCommand(
    execPath: string,
    inputPath: string,
    outputPath: string,
): string {
    return `${execPath} "${inputPath}" -o "${outputPath}" --export-type=pdf --export-area-drawing`;
}

export function convertImageToPdf(uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) {
    const replacedOutputPath = replaceOutputPath(uri.fsPath, 'TODO', workspaceFolder);
    createFolder(replacedOutputPath);
    const convertImageToPdfCommand = createConvertImageToPdfCommand(getExecPathInkscape(), uri.fsPath, replacedOutputPath);
    runCommand(convertImageToPdfCommand, workspaceFolder);
}
