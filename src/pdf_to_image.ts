import { getPdftocairoCommand, getPdfToPngOptions, getPdfToPngOutputPath, getShell } from './configuration';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export function pdfToImage(
    inputPath: string,
    outputPath: string,
    workspaceFolder: string = '',
    pdfToImageOptions: string[],
    fileType: string,
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
            `${getPdftocairoCommand()} ${pdfToImageOptions.join(' ')} "${path.normalize(inputPath)}" "${path.normalize(replacedOutputPath)}"`,
            {
                'cwd': folderName,
                'shell': getShell()
            }
        );
    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`Failed to convert PDF to ${fileType}: ${inputPath} - ${error.message}`);
        }

        return;
    }
}
