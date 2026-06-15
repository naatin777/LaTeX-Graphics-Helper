import * as os from 'node:os';

import * as vscode from 'vscode';

import type {
    ExecutablePath,
    JpegTemplatePath,
    PasteClipboardImageAs,
    PdfTemplatePath,
    PngTemplatePath,
    SvgTemplatePath,
    TemplatePath,
} from './type';

export interface AppConfig {
    execPathPdfcrop: ExecutablePath;
    execPathDrawio: ExecutablePath;
    execPathPdftocairo: ExecutablePath;
    execPathRsvgConvert: ExecutablePath;
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
    pasteClipboardImageAs: PasteClipboardImageAs;
    figurePlacementOptions: string[];
    figureAlignmentOptions: string[];
    figureGraphicsOptions: string[];
    subfigureVerticalAlignmentOptions: string[];
    subfigureWidthOptions: string[];
    subfigureSpacingOptions: string[];
}

export function getAppConfig(): AppConfig {
    return {
        execPathPdfcrop: getExecPathPdfcrop(),
        execPathDrawio: getExecPathDrawio(),
        execPathPdftocairo: getExecPathPdftocairo(),
        execPathRsvgConvert: getExecPathRsvgConvert(),
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
        pasteClipboardImageAs: getPasteClipboardImageAs(),
        figurePlacementOptions: getFigurePlacementOptions(),
        figureAlignmentOptions: getFigureAlignmentOptions(),
        figureGraphicsOptions: getFigureGraphicsOptions(),
        subfigureVerticalAlignmentOptions: getSubfigureVerticalAlignmentOptions(),
        subfigureWidthOptions: getSubfigureWidthOptions(),
        subfigureSpacingOptions: getSubfigureSpacingOptions(),
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

function getExecPathRsvgConvert(): ExecutablePath {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    const rsvgCommand = configuration.get<string>('execPath.rsvgConvert');
    if (rsvgCommand && rsvgCommand.length > 0) {
        return rsvgCommand as ExecutablePath;
    }
    return (os.platform() === 'win32' ? 'rsvg-convert.exe' : 'rsvg-convert') as ExecutablePath;
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

function getPasteClipboardImageAs(): PasteClipboardImageAs {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    return configuration.get<PasteClipboardImageAs>('pasteClipboardImageAs') ?? 'ask';
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
