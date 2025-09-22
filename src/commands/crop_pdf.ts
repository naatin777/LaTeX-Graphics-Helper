import * as vscode from 'vscode';

import { AppConfig } from '../configuration';
import { ExecPath } from '../type';
import { createFolder, replaceOutputPath, runCommand } from '../utils';

export function createCropPdfCommand(
    execPath: ExecPath,
    inputPath: string,
    outputPath: string,
): string {
    return `${execPath} "${inputPath}" "${outputPath}"`;
}

export function cropPdf(uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder, config: AppConfig): void {
    const replacedOutputPath = replaceOutputPath(uri.fsPath, config.outputPathCropPdf, workspaceFolder);
    createFolder(replacedOutputPath);
    const cropPdfCommand = createCropPdfCommand(config.execPathPdfcrop, uri.fsPath, replacedOutputPath);
    runCommand(cropPdfCommand, workspaceFolder);
}
