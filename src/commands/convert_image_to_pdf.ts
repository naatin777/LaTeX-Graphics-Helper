import { execFileSync } from 'child_process';

import * as vscode from 'vscode';

import { AppConfig } from '../configuration';
import { PdfOutputPath } from '../type';
import { createFolder, replaceOutputPath } from '../utils';

export function convertImageToPdf(uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder, outputPath: PdfOutputPath, config: AppConfig) {
    const replacedOutputPath = replaceOutputPath(uri.fsPath, outputPath, workspaceFolder);
    createFolder(replacedOutputPath);
    execFileSync(config.execPathInkscape, [uri.fsPath, '-o', replacedOutputPath, '--export-type=pdf', '--export-area-drawing'], { cwd: workspaceFolder.uri.fsPath });
}
