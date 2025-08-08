import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getShell, getOutputPathCropPdf, getExecPathPdfcrop } from './configuration';

export function cropPdf(
    inputPath: string,
    outputPath: string,
    workspaceFolder: string = '',
): void {
    if (!fs.existsSync(inputPath)) {
        vscode.window.showErrorMessage(`File does not exist: ${inputPath}`);
        return;
    }

    const fileName = path.basename(inputPath, path.extname(inputPath));
    const folderName = path.dirname(inputPath);
    const fileBasenameNoExtension = path.basename(inputPath, path.extname(inputPath));
    const fileExtname = path.extname(inputPath);
    const fileDirname = path.dirname(inputPath);

    const replacedOutputPath = outputPath
        .replace(/\${fileBasenameNoExtension}/g, fileBasenameNoExtension)
        .replace(/\${fileExtname}/g, fileExtname)
        .replace(/\${fileDirname}/g, fileDirname)
        .replace(/\${workspaceFolder}/g, workspaceFolder);
    const replacedOutputFolderPath = path.dirname(replacedOutputPath);

    if (!fs.existsSync(replacedOutputFolderPath)) {
        fs.mkdirSync(replacedOutputFolderPath, { recursive: true });
    }

    try {
        execSync(
            `${getExecPathPdfcrop()} "${path.normalize(inputPath)}" "${path.normalize(replacedOutputPath)}"`,
            {
                'cwd': fileDirname,
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
