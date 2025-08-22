import * as path from 'path';

import * as vscode from 'vscode';

import { getExecPathPdfcrop } from '../configuration';
import { createFolder, replaceOutputPath } from '../utils';

export function createCropPdfCommand(
    inputPath: string,
    outputPath: string,
    workspaceFolder: vscode.WorkspaceFolder,
): string {
    const replacedOutputPath = replaceOutputPath(inputPath, outputPath, workspaceFolder);
    createFolder(replacedOutputPath);

    return `${getExecPathPdfcrop()} "${path.normalize(inputPath)}" "${path.normalize(replacedOutputPath)}"`;
}
