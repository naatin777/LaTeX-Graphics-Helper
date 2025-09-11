import * as vscode from 'vscode';

import { AppConfig } from '../configuration'; // 追加
import { createFolder, replaceOutputPath, runCommand } from '../utils';

export function createCropPdfCommand(
    execPath: string,
    inputPath: string,
    outputPath: string,
): string {
    return `${execPath} "${inputPath}" "${outputPath}"`;
}

export function cropPdf(uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder, config: AppConfig): void { // 追加
    const replacedOutputPath = replaceOutputPath(uri.fsPath, config.outputPathCropPdf, workspaceFolder); // 変更
    createFolder(replacedOutputPath);
    const cropPdfCommand = createCropPdfCommand(config.execPathPdfcrop, uri.fsPath, replacedOutputPath); // 変更
    runCommand(cropPdfCommand, workspaceFolder);
}
