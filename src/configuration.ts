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

export function getPdfcropOutputPath(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');

    return config.get<string>('pdfcropOutputPath') ?? '${folderName}/${fileName}-crop.pdf';
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

export function getDrawioToPdfOutputPath(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');

    return config.get<string>('drawioToPdfOutputPath') ?? '${folderName}/${fileName}/${tabName}.pdf';
}

export function getDefaultPlacementSpecifiers(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string>('defaultPlacementSpecifiers') ?? 'H';
}

export function getDefaultGraphicsOptions(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string>('defaultGraphicsOptions') ?? 'width=0.8\\linewidth';
}
