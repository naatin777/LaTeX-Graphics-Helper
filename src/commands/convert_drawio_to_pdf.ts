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

    return `${getExecPathDrawio()} "${inputPath}" -o "${replacedOutputPath}" -xf pdf -t -a`;
}
