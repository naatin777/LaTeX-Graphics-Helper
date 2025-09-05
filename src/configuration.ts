import * as os from 'os';

import * as vscode from 'vscode';

import { ImageOutputPath, PdfOutputPath } from './type';

const config = vscode.workspace.getConfiguration('latex-graphics-helper');

export function getShell(): string {
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
    return config.get<string>('execPath.pdfcrop') as string;
}

export function getExecPathDrawio(): string {
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
    return config.get<string>('execPath.pdftocairo') as string;
}

export function getExecPathInkscape(): string {
    const inkscapeCommand = config.get<string>('execPath.inkscape');
    const platform = os.platform();

    if (platform === 'win32') {
        return inkscapeCommand || '"C:\\Program Files\\Inkscape\\bin\\inkscape.exe"';
    } else {
        return inkscapeCommand || 'inkscape';
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

export function getPdftocairoPngOptions(): string[] {
    return config.get<string[]>('pdftocairo.pngOptions') as string[];
}

export function getPdftocairoJpegOptions(): string[] {
    return config.get<string[]>('pdftocairo.jpegOptions') as string[];
}

export function getPdftocairoSvgOptions(): string[] {
    return config.get<string[]>('pdftocairo.svgOptions') as string[];
}

export function getGeminiModel(): string {
    return config.get<string>('gemini.model') as string;
}

export function getGeminiRequests(): string[] {
    return config.get<string[]>('gemini.requests') as string[];
}
