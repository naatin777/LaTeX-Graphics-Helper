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

export function getPlacementSpecifiersUseDefault(): boolean {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<boolean>('placementSpecifiers.useDefault') ?? false;
}

export function getPlacementSpecifiersDefault(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string>('placementSpecifiers.default') ?? '[H]';
}

export function getPlacementSpecifiersChoice(): string[] {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string[]>('placementSpecifiers.choice') ?? [
        '[H]',
        '[h]',
        '[t]',
        '[b]',
        '[p]',
        '[ht]',
        '[hb]',
        '[hp]',
        '[tb]',
        '[tp]',
        '[bp]',
        '[htb]',
        '[htp]',
        '[hbp]',
        '[tbp]',
        '[htbp]'
    ];
}

export function getGraphicsOptionsDefault(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string>('graphicsOptions.default') ?? '[width=0.8\\linewidth]';
}

export function getMinipageOptionsUseDefault(): boolean {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<boolean>('minipageOptions.useDefault') ?? false;
}

export function getMinipageOptionsDefault(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string>('minipageOptions.default') ?? '[b]';
}

export function getMinipageOptionsChoice(): string[] {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string[]>('minipageOptions.choice') ?? [
        '[t]',
        '[c]',
        '[b]'
    ];
}

export function getPdftocairoCommand(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string>('pdftocairoCommand') ?? 'pdftocairo';
}

export function getPdfToPngOutputPath(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string>('pdfToPngOutputPath') ?? '${folderName}/${fileName}.png';
}

export function getPdfToJpegOutputPath(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string>('pdfToJpegOutputPath') ?? '${folderName}/${fileName}.jpeg';
}

export function getPdfToSvgOutputPath(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string>('pdfToSvgOutputPath') ?? '${folderName}/${fileName}.svg';
}
