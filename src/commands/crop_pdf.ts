import { execFileSync } from 'child_process';

import * as vscode from 'vscode';

import { AppConfig } from '../configuration';
import { createFolder, replaceOutputPath } from '../utils';

export function cropPdf(uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder, config: AppConfig): void {
    const replacedOutputPath = replaceOutputPath(uri.fsPath, config.outputPathCropPdf, workspaceFolder);
    createFolder(replacedOutputPath);
    execFileSync(config.execPathPdfcrop, [uri.fsPath, replacedOutputPath], { cwd: workspaceFolder.uri.fsPath });
}
