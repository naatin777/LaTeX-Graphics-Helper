import * as fs from 'fs';
import * as path from 'path';

import * as vscode from 'vscode';

import { getExecPathPdftocairo } from '../configuration';
import { createFolder, replaceOutputPath, runCommand } from '../utils';

export function convertPdfToImage(
    inputPath: string,
    outputPath: string,
    workspaceFolder: vscode.WorkspaceFolder,
    pdfToImageOptions: string[],
): void {
    if (!fs.existsSync(inputPath)) {
        throw new Error(`File does not exist: ${inputPath}`);
    }

    const replacedOutputPath = replaceOutputPath(inputPath, outputPath, workspaceFolder);
    createFolder(replacedOutputPath);

    runCommand(
        `${getExecPathPdftocairo()} ${pdfToImageOptions.join(' ')} "${path.normalize(inputPath)}" "${path.normalize(replacedOutputPath)}"`,
        workspaceFolder
    );
}
