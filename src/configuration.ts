import * as vscode from 'vscode';
import * as os from 'os';

export function getShell(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    const shell = config.get<string>('shell');
    const platform = os.platform();

    if (platform === 'win32') {
        return shell || 'powershell.exe';
    } else if (platform === 'darwin') {
        return shell || '/bin/zsh';
    } else {
        return shell || '/bin/bash';
    }
}

export function getPdfcropCommand(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');

    return config.get<string>('pdfcropCommand') ?? 'pdfcrop';
}

export function getPdfcropFile(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');

    return config.get<string>('pdfcropFile') ?? '${folderName}/${fileName}-crop.pdf';
}

export function getDrawioCommand(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    const drawioCommand = config.get<string>('drawioCommand');
    const platform = os.platform();

    if (platform === 'win32') {
        return drawioCommand || '"C:\\Program Files\\draw.io\\draw.io.exe"';
    } else if (platform === 'darwin') {
        return drawioCommand || '/Applications/draw.io.app/Contents/MacOS/draw.io';
    } else {
        return drawioCommand || 'drawio';
    }
}

export function getDrawioToPdfFile(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');

    return config.get<string>('drawioToPdfFile') ?? '${folderName}/${fileName}/${tabName}.pdf';
}
