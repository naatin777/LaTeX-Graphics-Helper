import { execFileSync } from 'child_process';

import * as vscode from 'vscode';

import { AppConfig } from '../configuration';
import { ExecPath, PdfOutputPath } from '../type';
import { createFolder, replaceOutputPath } from '../utils';

export function createConvertImageToPdfCommand(
    execPath: ExecPath,
    inputPath: string,
    outputPath: string,
): string {
    return `${execPath} "${inputPath}" -o "${outputPath}" --export-type=pdf --export-area-drawing`;
}

export function convertImageToPdf(uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder, outputPath: PdfOutputPath, config: AppConfig) {
    const replacedOutputPath = replaceOutputPath(uri.fsPath, outputPath, workspaceFolder);
    createFolder(replacedOutputPath);
    const convertImageToPdfCommand = createConvertImageToPdfCommand(config.execPathInkscape, uri.fsPath, replacedOutputPath);
    execFileSync(convertImageToPdfCommand);
}
