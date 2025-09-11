import * as vscode from 'vscode';

import { AppConfig } from '../configuration'; // 追加
import { ExecPath, PdfOutputPath } from '../type';
import { createFolder, replaceOutputPath, runCommand } from '../utils';

export function createConvertImageToPdfCommand(
    execPath: ExecPath,
    inputPath: string,
    outputPath: string,
): string {
    return `${execPath} "${inputPath}" -o "${outputPath}" --export-type=pdf --export-area-drawing`;
}

export function convertImageToPdf(uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder, outputPath: PdfOutputPath, config: AppConfig) { // 追加
    const replacedOutputPath = replaceOutputPath(uri.fsPath, outputPath, workspaceFolder);
    createFolder(replacedOutputPath);
    const convertImageToPdfCommand = createConvertImageToPdfCommand(config.execPathInkscape, uri.fsPath, replacedOutputPath); // 変更
    runCommand(convertImageToPdfCommand, workspaceFolder);
}
