import * as os from 'os';

import * as vscode from 'vscode';

import { ExecutablePath, JpegTemplatePath, PdfTemplatePath, PngTemplatePath, SvgTemplatePath } from './type';

export interface AppConfig {
    execPathPdfcrop: ExecutablePath;
    execPathDrawio: ExecutablePath;
    execPathPdftocairo: ExecutablePath;
    outputPathCropPdf: PdfTemplatePath;
    outputPathSplitPdf: PdfTemplatePath;
    outputPathConvertDrawioToPdf: PdfTemplatePath;
    outputPathConvertPdfToPng: PngTemplatePath;
    outputPathConvertPdfToJpeg: JpegTemplatePath;
    outputPathConvertPdfToSvg: SvgTemplatePath;
    outputPathConvertPngToPdf: PdfTemplatePath;
    outputPathConvertJpegToPdf: PdfTemplatePath;
    outputPathConvertSvgToPdf: PdfTemplatePath;
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
        execPathPdfcrop: getExecPathPdfcrop(),
        execPathDrawio: getExecPathDrawio(),
        execPathPdftocairo: getExecPathPdftocairo(),
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

function getExecPathDrawio(): ExecutablePath {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    const drawioCommand = configuration.get<string>('execPath.drawio');
    const platform = os.platform();

    if (platform === 'win32') {
        return (drawioCommand || 'draw.io.exe') as ExecutablePath;
    } else if (platform === 'darwin') {
        return (drawioCommand || 'draw.io') as ExecutablePath;
    } else {
        return (drawioCommand || 'drawio') as ExecutablePath;
    }
}

function getExecPathPdfcrop(): ExecutablePath {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string>('execPath.pdfcrop') as ExecutablePath;
}

function getExecPathPdftocairo(): ExecutablePath {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string>('execPath.pdftocairo') as ExecutablePath;
}

function getOutputPathCropPdf(): PdfTemplatePath {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string>('outputPath.cropPdf') as PdfTemplatePath;
}

function getOutputPathSplitPdf(): PdfTemplatePath {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string>('outputPath.splitPdf') as PdfTemplatePath;
}

function getOutputPathConvertDrawioToPdf(): PdfTemplatePath {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string>('outputPath.convertDrawioToPdf') as PdfTemplatePath;
}

function getOutputPathConvertPdfToPng(): PngTemplatePath {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string>('outputPath.convertPdfToPng') as PngTemplatePath;
}

function getOutputPathConvertPdfToJpeg(): JpegTemplatePath {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string>('outputPath.convertPdfToJpeg') as JpegTemplatePath;
}

function getOutputPathConvertPdfToSvg(): SvgTemplatePath {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string>('outputPath.convertPdfToSvg') as SvgTemplatePath;
}

function getOutputPathConvertPngToPdf(): PdfTemplatePath {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string>('outputPath.convertPngToPdf') as PdfTemplatePath;
}

function getOutputPathConvertJpegToPdf(): PdfTemplatePath {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string>('outputPath.convertJpegToPdf') as PdfTemplatePath;
}

function getOutputPathConvertSvgToPdf(): PdfTemplatePath {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string>('outputPath.convertSvgToPdf') as PdfTemplatePath;
}

function getOutputPathClipboardImage(): string {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string>('outputPath.clipboardImage') as string;
}

function getChoiceFigurePlacement(): string[] {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string[]>('choice.figurePlacement') as string[];
}

function getChoiceFigureAlignment(): string[] {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string[]>('choice.figureAlignment') as string[];
}

function getChoiceGraphicsOptions(): string[] {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string[]>('choice.graphicsOptions') as string[];
}

function getChoiceSubVerticalAlignment(): string[] {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string[]>('choice.subVerticalAlignment') as string[];
}

function getChoiceSubWidth(): string[] {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string[]>('choice.subWidth') as string[];
}

function getChoiceSpaceBetweenSubs(): string[] {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string[]>('choice.spaceBetweenSubs') as string[];
}

function getGeminiModel(): string {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string>('gemini.model') as string;
}

function getGeminiRequests(): string[] {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string[]>('gemini.requests') as string[];
}
