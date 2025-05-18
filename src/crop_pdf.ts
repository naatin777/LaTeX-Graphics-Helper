import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getShell } from './shell';


function getPdfcropCommand(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');

    return config.get<string>('pdfcropCommand') ?? 'pdfcrop';
}

function getPdfcropFile(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');

    return config.get<string>('pdfcropFile') ?? '${folderName}/${fileName}-crop.pdf';
}

export function cropPdf(
    inputFile: string,
    outputFile: string = getPdfcropFile(),
    workspaceFolder: string = "",
): void {
    if (!fs.existsSync(inputFile)) {
        vscode.window.showErrorMessage(`File does not exist: ${inputFile}`);
        return;
    }

    const fileName = path.basename(inputFile, path.extname(inputFile));
    const folderName = path.dirname(inputFile);
    const replacedOutputFile = outputFile
        .replace(/\${fileName}/g, fileName)
        .replace(/\${folderName}/g, folderName)
        .replace(/\${workspaceFolder}/g, workspaceFolder);
    const replacedOutputFolder = path.dirname(replacedOutputFile);

    if (!fs.existsSync(replacedOutputFolder)) {
        fs.mkdirSync(replacedOutputFolder, { recursive: true });
    }

    try {
        execSync(
            `${getPdfcropCommand()} "${path.normalize(inputFile)}" "${path.normalize(replacedOutputFile)}"`,
            {
                "cwd": folderName,
                "shell": getShell()
            }
        );
    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`Failed to crop PDF: ${inputFile} - ${error.message}`);
        }
        return;
    }
}

