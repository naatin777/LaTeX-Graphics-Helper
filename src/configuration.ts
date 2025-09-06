import * as os from 'os';

import * as vscode from 'vscode';

import { ExecPath, ImageOutputPath, PdfOutputPath, PdftocairoOptions, Shell } from './type';

const config = vscode.workspace.getConfiguration('latex-graphics-helper');

export function getShell(): Shell {
    const shell = config.get<string>('shell');
    const platform = os.platform();

    if (platform === 'win32') {
        return (shell || 'powershell.exe') as Shell;
    } else if (platform === 'darwin') {
        return (shell || '/bin/zsh') as Shell;
    } else {
        return (shell || '/bin/bash') as Shell;
    }
}

export function getExecPathPdfcrop(): ExecPath {
    return config.get<string>('execPath.pdfcrop') as ExecPath;
}

export function getExecPathDrawio(): ExecPath {
    const drawioCommand = config.get<string>('execPath.drawio');
    const platform = os.platform();

    if (platform === 'win32') {
        return (drawioCommand || '"C:\\Program Files\\draw.io\\draw.io.exe"') as ExecPath;
    } else if (platform === 'darwin') {
        return (drawioCommand || '/Applications/draw.io.app/Contents/MacOS/draw.io') as ExecPath;
    } else {
        return (drawioCommand || 'drawio') as ExecPath;
    }
}

export function getExecPathPdftocairo(): ExecPath {
    return config.get<string>('execPath.pdftocairo') as ExecPath;
}

export function getExecPathInkscape(): ExecPath {
    const inkscapeCommand = config.get<string>('execPath.inkscape');
    const platform = os.platform();

    if (platform === 'win32') {
        return (inkscapeCommand || '"C:\\Program Files\\Inkscape\\bin\\inkscape.exe"') as ExecPath;
    } else {
        return (inkscapeCommand || 'inkscape') as ExecPath;
    }
}

export function getOutputPathCropPdf(): string {
    return config.get<string>('outputPath.cropPdf') as string;
}

export function getOutputPathSplitPdf(): string {
    return config.get<string>('outputPath.splitPdf') as string;
}

export function getOutputPathConvertDrawioToPdf(): string {
    return config.get<string>('outputPath.convertDrawioToPdf') as string;
}

export function getOutputPathConvertPdfToPng(): ImageOutputPath {
    return config.get<string>('outputPath.convertPdfToPng') as ImageOutputPath;
}

export function getOutputPathConvertPdfToJpeg(): ImageOutputPath {
    return config.get<string>('outputPath.convertPdfToJpeg') as ImageOutputPath;
}

export function getOutputPathConvertPdfToSvg(): ImageOutputPath {
    return config.get<string>('outputPath.convertPdfToSvg') as ImageOutputPath;
}

export function getOutputPathConvertPngToPdf(): PdfOutputPath {
    return config.get<string>('outputPath.convertPngToPdf') as PdfOutputPath;
}

export function getOutputPathConvertJpegToPdf(): PdfOutputPath {
    return config.get<string>('outputPath.convertJpegToPdf') as PdfOutputPath;
}

export function getOutputPathConvertSvgToPdf(): PdfOutputPath {
    return config.get<string>('outputPath.convertSvgToPdf') as PdfOutputPath;
}

export function getOutputPathClipboardImage(): string {
    return config.get<string>('outputPath.clipboardImage') as string;
}

export function getChoiceFigurePlacement(): string[] {
    return config.get<string[]>('choice.figurePlacement') as string[];
}

export function getChoiceFigureAlignment(): string[] {
    return config.get<string[]>('choice.figureAlignment') as string[];
}

export function getChoiceGraphicsOptions(): string[] {
    return config.get<string[]>('choice.graphicsOptions') as string[];
}

export function getChoiceSubVerticalAlignment(): string[] {
    return config.get<string[]>('choice.subVerticalAlignment') as string[];
}

export function getChoiceSubWidth(): string[] {
    return config.get<string[]>('choice.subWidth') as string[];
}

export function getChoiceSpaceBetweenSubs(): string[] {
    return config.get<string[]>('choice.spaceBetweenSubs') as string[];
}

export function getPdftocairoPngOptions(): PdftocairoOptions {
    return config.get<string[]>('pdftocairo.pngOptions') as PdftocairoOptions;
}

export function getPdftocairoJpegOptions(): PdftocairoOptions {
    return config.get<string[]>('pdftocairo.jpegOptions') as PdftocairoOptions;
}

export function getPdftocairoSvgOptions(): PdftocairoOptions {
    return config.get<string[]>('pdftocairo.svgOptions') as PdftocairoOptions;
}

export function getGeminiModel(): string {
    return config.get<string>('gemini.model') as string;
}

export function getGeminiRequests(): string[] {
    return config.get<string[]>('gemini.requests') as string[];
}
