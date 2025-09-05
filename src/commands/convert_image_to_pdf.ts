import * as path from 'path';

import * as vscode from 'vscode';

import { getExecPathInkscape } from '../configuration';
import { createFolder, replaceOutputPath, runCommand } from '../utils';

export function createConvertImageToPdfCommand(
    inputPath: string,
    outputPath: string,
    workspaceFolder: vscode.WorkspaceFolder,
): string {
    const replacedOutputPath = replaceOutputPath(inputPath, outputPath, workspaceFolder);
    createFolder(replacedOutputPath);

    return `${getExecPathInkscape()} "${path.normalize(inputPath)}" -o "${path.normalize(replacedOutputPath)}" --export-type=pdf --export-area-drawing`;
}
