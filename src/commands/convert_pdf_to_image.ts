import * as path from 'path';

import * as vscode from 'vscode';

import { getExecPathPdftocairo } from '../configuration';
import { createFolder, replaceOutputPath } from '../utils';

export function createConvertPdfToImageCommand(
    inputPath: string,
    outputPath: string,
    workspaceFolder: vscode.WorkspaceFolder,
    pdfToImageOptions: string[],
): string {
    const replacedOutputPath = replaceOutputPath(inputPath, outputPath, workspaceFolder);
    createFolder(replacedOutputPath);

    return `${getExecPathPdftocairo()} ${pdfToImageOptions.join(' ')} "${path.normalize(inputPath)}" "${path.normalize(replacedOutputPath)}"`;
}
