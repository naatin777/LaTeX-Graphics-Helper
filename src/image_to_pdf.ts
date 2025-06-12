import { getInkscapeCommand, getShell } from './configuration';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export function imageToPdf(
    inputPath: string,
    outputPath: string,
    workspaceFolder: string = '',
): void {
    if (!fs.existsSync(inputPath)) {
        vscode.window.showErrorMessage(`File does not exist: ${inputPath}`);
        return;
    }

    const extname = path.extname(inputPath);
    const fileName = path.basename(inputPath, extname);
    const folderName = path.dirname(inputPath);
    const replacedOutputPath = outputPath
        .replace(/\${fileName}/g, fileName)
        .replace(/\${folderName}/g, folderName)
        .replace(/\${workspaceFolder}/g, workspaceFolder);
    const replacedOutputFolderPath = path.dirname(replacedOutputPath);

    if (!fs.existsSync(replacedOutputFolderPath)) {
        fs.mkdirSync(replacedOutputFolderPath, { recursive: true });
    }
    try {
        execSync(
            `${getInkscapeCommand()} "${path.normalize(inputPath)}" -o "${path.normalize(replacedOutputPath)}" --export-type=pdf --export-area-drawing`,
            {
                'cwd': folderName,
                'shell': getShell()
            }
        );
    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`Failed to convert ${extname.toUpperCase()} to PDF: ${inputPath} - ${error.message}`);
        }

        return;
    }
}
