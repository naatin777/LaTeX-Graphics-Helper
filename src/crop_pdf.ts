import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getShell, getPdfcropOutputPath, getPdfcropCommand } from './configuration';

export function cropPdf(
    inputPath: string,
    outputPath: string = getPdfcropOutputPath(),
    workspaceFolder: string = '',
): void {
    if (!fs.existsSync(inputPath)) {
        vscode.window.showErrorMessage(`File does not exist: ${inputPath}`);
        return;
    }

    const fileName = path.basename(inputPath, path.extname(inputPath));
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
            `${getPdfcropCommand()} "${path.normalize(inputPath)}" "${path.normalize(replacedOutputPath)}"`,
            {
                'cwd': folderName,
                'shell': getShell()
            }
        );
    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`Failed to crop PDF: ${inputPath} - ${error.message}`);
        }

        return;
    }
}
