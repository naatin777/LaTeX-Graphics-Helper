import * as vscode from 'vscode';

import { getExecPathPdfcrop, getOutputPathCropPdf } from '../configuration';
import { createFolder, replaceOutputPath, runCommand } from '../utils';

export function createCropPdfCommand(
    execPath: string,
    inputPath: string,
    outputPath: string,
): string {
    return `${execPath} "${inputPath}" "${outputPath}"`;
}

export function cropPdf(uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder): void {
    const replacedOutputPath = replaceOutputPath(uri.fsPath, getOutputPathCropPdf(), workspaceFolder);
    createFolder(replacedOutputPath);
    const cropPdfCommand = createCropPdfCommand(getExecPathPdfcrop(), uri.fsPath, replacedOutputPath);
    runCommand(cropPdfCommand, workspaceFolder);
}
