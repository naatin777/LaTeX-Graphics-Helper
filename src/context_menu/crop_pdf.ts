import * as path from 'path';

import * as vscode from 'vscode';

import { getExecPathPdfcrop } from '../configuration';
import { createFolder, replaceOutputPath, runCommand } from '../utils';

export function cropPdf(
    inputPath: string,
    outputPath: string,
    workspaceFolder: vscode.WorkspaceFolder,
): void {
    const replacedOutputPath = replaceOutputPath(inputPath, outputPath, workspaceFolder);
    createFolder(replacedOutputPath);

    runCommand(
        `${getExecPathPdfcrop()} "${path.normalize(inputPath)}" "${path.normalize(replacedOutputPath)}"`,
        workspaceFolder
    );
}
