import * as os from 'os';

import { ChromeReleaseChannel, SupportedBrowser } from 'puppeteer-core';
import * as vscode from 'vscode';

import { ExecutablePath, GeminiRequest, JpegTemplatePath, PdfTemplatePath, PngTemplatePath, SvgTemplatePath, TemplatePath } from './type';

export interface AppConfig {
    execPathPdfcrop: ExecutablePath;
    execPathDrawio: ExecutablePath;
    execPathPdftocairo: ExecutablePath;
    execPathPuppeteer: ExecutablePath,
    puppeteerBrowser: SupportedBrowser,
    puppeteerChannel: ChromeReleaseChannel,
    outputPathCropPdf: PdfTemplatePath;
    outputPathSplitPdf: PdfTemplatePath;
    outputPathConvertDrawioToPdf: PdfTemplatePath;
    outputPathConvertPdfToPng: PngTemplatePath;
    outputPathConvertPdfToJpeg: JpegTemplatePath;
    outputPathConvertPdfToSvg: SvgTemplatePath;
    outputPathConvertPngToPdf: PdfTemplatePath;
    outputPathConvertJpegToPdf: PdfTemplatePath;
    outputPathConvertSvgToPdf: PdfTemplatePath;
    outputPathClipboardImage: TemplatePath;
    figurePlacementOptions: string[];
    figureAlignmentOptions: string[];
    figureGraphicsOptions: string[];
    subfigureVerticalAlignmentOptions: string[];
    subfigureWidthOptions: string[];
    subfigureSpacingOptions: string[];
    geminiModel: string;
    geminiRequests: GeminiRequest[];
}

export function getAppConfig(): AppConfig {
    return {
        execPathPdfcrop: getExecPathPdfcrop(),
        execPathDrawio: getExecPathDrawio(),
        execPathPdftocairo: getExecPathPdftocairo(),
        execPathPuppeteer: getExecPathPuppeteer(),
        puppeteerBrowser: getPuppeteerBrowser(),
        puppeteerChannel: getPuppeteerChannel(),
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
        figurePlacementOptions: getFigurePlacementOptions(),
        figureAlignmentOptions: getFigureAlignmentOptions(),
        figureGraphicsOptions: getFigureGraphicsOptions(),
        subfigureVerticalAlignmentOptions: getSubfigureVerticalAlignmentOptions(),
        subfigureWidthOptions: getSubfigureWidthOptions(),
        subfigureSpacingOptions: getSubfigureSpacingOptions(),
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

function getExecPathPuppeteer(): ExecutablePath {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string>('execPath.puppeteer') as ExecutablePath;
}

function getPuppeteerBrowser(): SupportedBrowser {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string>('puppeteer.browser') as SupportedBrowser;
}

function getPuppeteerChannel(): ChromeReleaseChannel {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string>('puppeteer.channel') as ChromeReleaseChannel;
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

function getOutputPathClipboardImage(): TemplatePath {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string>('outputPath.clipboardImage') as TemplatePath;
}

function getFigurePlacementOptions(): string[] {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string[]>('figure.placementOptions') as string[];
}

function getFigureAlignmentOptions(): string[] {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string[]>('figure.alignmentOptions') as string[];
}

function getFigureGraphicsOptions(): string[] {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string[]>('figure.graphicsOptions') as string[];
}

function getSubfigureVerticalAlignmentOptions(): string[] {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string[]>('subfigure.verticalAlignmentOptions') as string[];
}

function getSubfigureWidthOptions(): string[] {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string[]>('subfigure.widthOptions') as string[];
}

function getSubfigureSpacingOptions(): string[] {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string[]>('subfigure.spacingOptions') as string[];
}

function getGeminiModel(): string {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<string>('gemini.model') as string;
}

function getGeminiRequests(): GeminiRequest[] {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<GeminiRequest[]>('gemini.requests') as GeminiRequest[];
}
