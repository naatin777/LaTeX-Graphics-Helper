import * as os from 'os';

import * as vscode from 'vscode';

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

export function getExecPathPdfcrop(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string>('execPath.pdfcrop') as string;
}

export function getExecPathDrawio(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    const drawioCommand = config.get<string>('execPath.drawio');
    const platform = os.platform();

    if (platform === 'win32') {
        return drawioCommand || '"C:\\Program Files\\draw.io\\draw.io.exe"';
    } else if (platform === 'darwin') {
        return drawioCommand || '/Applications/draw.io.app/Contents/MacOS/draw.io';
    } else {
        return drawioCommand || 'drawio';
    }
}

export function getExecPathPdftocairo(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string>('execPath.pdftocairo') as string;
}

export function getExecPathInkscape(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    const inkscapeCommand = config.get<string>('execPath.inkscape');
    const platform = os.platform();

    if (platform === 'win32') {
        return inkscapeCommand || '"C:\\Program Files\\Inkscape\\bin\\inkscape.exe"';
    } else {
        return inkscapeCommand || 'inkscape';
    }
}

export function getOutputPathCropPdf(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string>('outputPath.cropPdf') as string;
}

export function getOutputPathConvertDrawioToPdf(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string>('outputPath.convertDrawioToPdf') as string;
}

export function getOutputPathConvertPdfToPng(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string>('outputPath.convertPdfToPng') as string;
}

export function getOutputPathConvertPdfToJpeg(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string>('outputPath.convertPdfToJpeg') as string;
}

export function getOutputPathConvertPdfToSvg(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string>('outputPath.convertPdfToSvg') as string;
}

export function getOutputPathConvertPngToPdf(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string>('outputPath.convertPngToPdf') as string;
}

export function getOutputPathConvertJpegToPdf(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string>('outputPath.convertJpegToPdf') as string;
}

export function getOutputPathConvertSvgToPdf(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string>('outputPath.convertSvgToPdf') as string;
}

export function getOutputPathClipboardImage(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string>('outputPath.clipboardImage') as string;
}

export function getChoiceFigurePlacement(): string[] {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string[]>('choice.figurePlacement') as string[];
}

export function getChoiceFigureAlignment(): string[] {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string[]>('choice.figureAlignment') as string[];
}

export function getChoiceGraphicsOptions(): string[] {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string[]>('choice.graphicsOptions') as string[];
}

export function getChoiceSubVerticalAlignment(): string[] {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string[]>('choice.subVerticalAlignment') as string[];
}

export function getChoiceSubWidth(): string[] {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string[]>('choice.subWidth') as string[];
}

export function getChoiceSpaceBetweenSubs(): string[] {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string[]>('choice.spaceBetweenSubs') as string[];
}

export function getPdftocairoPngOptions(): string[] {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string[]>('pdftocairo.pngOptions') as string[];
}

export function getPdftocairoJpegOptions(): string[] {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string[]>('pdftocairo.jpegOptions') as string[];
}

export function getPdftocairoSvgOptions(): string[] {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string[]>('pdftocairo.svgOptions') as string[];
}

export function getGeminiModel(): string {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string>('gemini.model') as string;
}

export function getGeminiRequests(): string[] {
    const config = vscode.workspace.getConfiguration('latex-graphics-helper');
    return config.get<string[]>('gemini.requests') as string[];
}
