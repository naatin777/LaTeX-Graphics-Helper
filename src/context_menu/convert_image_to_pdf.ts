import * as path from 'path';

import * as vscode from 'vscode';

import { getExecPathInkscape } from '../configuration';
import { createFolder, replaceOutputPath, runCommand } from '../utils';

export function convertImageToPdf(
    inputPath: string,
    outputPath: string,
    workspaceFolder: vscode.WorkspaceFolder,
): void {
    const replacedOutputPath = replaceOutputPath(inputPath, outputPath, workspaceFolder);
    createFolder(replacedOutputPath);

    runCommand(
        `${getExecPathInkscape()} "${path.normalize(inputPath)}" -o "${path.normalize(replacedOutputPath)}" --export-type=pdf --export-area-drawing`,
        workspaceFolder
    );
}
