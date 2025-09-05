import * as path from 'path';

import * as vscode from 'vscode';

import { getExecPathDrawio } from '../configuration';
import { createFolder, replaceOutputPath } from '../utils';

export function createConvertDrawioToPdfCommand(
    inputPath: string,
    outputPath: string,
    workspaceFolder: vscode.WorkspaceFolder,
): string {
    const replacedOutputPath = replaceOutputPath(inputPath, outputPath, workspaceFolder);
    createFolder(replacedOutputPath);

    return `${getExecPathDrawio()} -xf pdf -t -a -o "${replacedOutputPath}" "${path.normalize(inputPath)}"`;
}
