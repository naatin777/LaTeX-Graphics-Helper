import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getExecPathInkscape } from '../configuration';
import { createFolder, replaceOutputPath, runCommand } from '../utils';

export function convertImageToPdf(
    inputPath: string,
    outputPath: string,
    workspaceFolder: vscode.WorkspaceFolder,
): void {
    if (!fs.existsSync(inputPath)) {
        throw new Error(`File does not exist: ${inputPath}`);
    }

    const replacedOutputPath = `${replaceOutputPath(inputPath, outputPath, workspaceFolder)}.pdf`;
    createFolder(replacedOutputPath);

    runCommand(
        `${getExecPathInkscape()} "${path.normalize(inputPath)}" -o "${path.normalize(replacedOutputPath)}" --export-type=pdf --export-area-drawing`,
        workspaceFolder
    );
}
