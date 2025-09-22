import * as os from 'os';

import * as vscode from 'vscode';

import { ExecPath, ImageOutputPath, PdfOutputPath, Shell } from './type';

const config = vscode.workspace.getConfiguration('latex-graphics-helper');

export interface AppConfig {
    shell: Shell;
    execPathPdfcrop: ExecPath;
    execPathDrawio: ExecPath;
    execPathPdftocairo: ExecPath;
    execPathInkscape: ExecPath;
    outputPathCropPdf: string;
    outputPathSplitPdf: string;
    outputPathConvertDrawioToPdf: string;
    outputPathConvertPdfToPng: ImageOutputPath;
    outputPathConvertPdfToJpeg: ImageOutputPath;
    outputPathConvertPdfToSvg: ImageOutputPath;
    outputPathConvertPngToPdf: PdfOutputPath;
    outputPathConvertJpegToPdf: PdfOutputPath;
    outputPathConvertSvgToPdf: PdfOutputPath;
    outputPathClipboardImage: string;
    choiceFigurePlacement: string[];
    choiceFigureAlignment: string[];
    choiceGraphicsOptions: string[];
    choiceSubVerticalAlignment: string[];
    choiceSubWidth: string[];
    choiceSpaceBetweenSubs: string[];
    geminiModel: string;
    geminiRequests: string[];
}

export function getAppConfig(): AppConfig {
    return {
        shell: getShell(),
        execPathPdfcrop: getExecPathPdfcrop(),
        execPathDrawio: getExecPathDrawio(),
        execPathPdftocairo: getExecPathPdftocairo(),
        execPathInkscape: getExecPathInkscape(),
        outputPathCropPdf: getOutputPathCropPdf(),
        outputPathSplitPdf: getOutputPathSplitPdf(),
        outputPathConvertDrawioToPdf: getOutputPathConvertDrawioToPdf(),
        outputPathConvertPdfToPng: getOutputPathConvertPdfToPng(),
        outputPathConvertPdfToJpeg: getOutputPathConvertPdfToJpeg(),
        outputPathConvertPdfToSvg: getOutputPathConvertPdfToSvg(),
        outputPathConvertPngToPdf: getOutputPathConvertPngToPdf(),
        outputPathConvertJpegToPdf: getOutputPathConvertJpegToPdf(),
        outputPathConvertSvgToPdf: getOutputPathConvertSvgToPdf(),
        outputPathClipboardImage: getOutputPathClipboardImage(),
        choiceFigurePlacement: getChoiceFigurePlacement(),
        choiceFigureAlignment: getChoiceFigureAlignment(),
        choiceGraphicsOptions: getChoiceGraphicsOptions(),
        choiceSubVerticalAlignment: getChoiceSubVerticalAlignment(),
        choiceSubWidth: getChoiceSubWidth(),
        choiceSpaceBetweenSubs: getChoiceSpaceBetweenSubs(),
        geminiModel: getGeminiModel(),
        geminiRequests: getGeminiRequests(),
    };
}

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

export function getExecPathPdfcrop(): ExecPath {
    return config.get<string>('execPath.pdfcrop') as ExecPath;
}

export function getExecPathPdftocairo(): ExecPath {
    return config.get<string>('execPath.pdftocairo') as ExecPath;
}

export function getExecPathInkscape(): ExecPath {
    return config.get<string>('execPath.inkscape') as ExecPath;
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

export function getGeminiModel(): string {
    return config.get<string>('gemini.model') as string;
}

export function getGeminiRequests(): string[] {
    return config.get<string[]>('gemini.requests') as string[];
}
