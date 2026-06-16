import * as path from 'node:path';

import * as vscode from 'vscode';

import type { AppConfig } from '../configuration';
import { splitPdf } from '../core/split_pdf';
import type {
    JpegPath,
    JpegTemplatePath,
    PdfPath,
    PdfTemplatePath,
    PngPath,
    PngTemplatePath,
    SvgPath,
    SvgTemplatePath,
} from '../type';
import { execFileInWorkspace } from '../utils/exec_file_in_workspace';

/** splitPdf emits `{image-template}.pdf`; pdftocairo needs a plain stem prefix. */
function pdftocairoOutputPrefix(intermediatePdfPath: string): string {
    const withoutPdf = intermediatePdfPath.slice(0, -4);
    const imageExtension = path.extname(withoutPdf);
    return imageExtension.length > 0 ? withoutPdf.slice(0, -imageExtension.length) : withoutPdf;
}

export async function convertPdfToPng(
    appConfig: AppConfig,
    inputPath: PdfPath,
    outputTemplatePath: PngTemplatePath,
    workspaceFolder: vscode.WorkspaceFolder,
): Promise<PngPath[]> {
    const outputPdfPaths = await splitPdf(
        inputPath,
        (outputTemplatePath + '.pdf') as PdfTemplatePath,
        workspaceFolder,
        [],
    );
    const conversionPromises = outputPdfPaths.map(async (intermediatePdfPath: string) => {
        const outputPrefix = pdftocairoOutputPrefix(intermediatePdfPath);
        await execFileInWorkspace(
            appConfig.execPathPdftocairo,
            [intermediatePdfPath, outputPrefix, '-png', '-transp', '-singlefile'],
            workspaceFolder,
        );
        await vscode.workspace.fs.delete(vscode.Uri.file(intermediatePdfPath), {
            recursive: true,
            useTrash: false,
        });

        return `${outputPrefix}.png` as PngPath;
    });

    return Promise.all(conversionPromises);
}

export async function convertPdfToJpeg(
    appConfig: AppConfig,
    inputPath: PdfPath,
    outputTemplatePath: JpegTemplatePath,
    workspaceFolder: vscode.WorkspaceFolder,
): Promise<JpegPath[]> {
    const outputPdfPaths = await splitPdf(
        inputPath,
        (outputTemplatePath + '.pdf') as PdfTemplatePath,
        workspaceFolder,
        [],
    );
    const conversionPromises = outputPdfPaths.map(async (intermediatePdfPath: string) => {
        const outputPrefix = pdftocairoOutputPrefix(intermediatePdfPath);
        const jpegPath = `${outputPrefix}.jpeg`;
        await execFileInWorkspace(
            appConfig.execPathPdftocairo,
            [intermediatePdfPath, outputPrefix, '-jpeg', '-singlefile'],
            workspaceFolder,
        );
        const jpgUri = vscode.Uri.file(`${outputPrefix}.jpg`);
        const jpegUri = vscode.Uri.file(jpegPath);
        try {
            await vscode.workspace.fs.stat(jpgUri);
            await vscode.workspace.fs.rename(jpgUri, jpegUri, { overwrite: true });
        } catch {
            await vscode.workspace.fs.stat(jpegUri);
        }
        await vscode.workspace.fs.delete(vscode.Uri.file(intermediatePdfPath), {
            recursive: true,
            useTrash: false,
        });

        return jpegPath as JpegPath;
    });

    return Promise.all(conversionPromises);
}

export async function convertPdfToSvg(
    appConfig: AppConfig,
    inputPath: PdfPath,
    outputTemplatePath: SvgTemplatePath,
    workspaceFolder: vscode.WorkspaceFolder,
): Promise<SvgPath[]> {
    const outputPdfPaths = await splitPdf(
        inputPath,
        (outputTemplatePath + '.pdf') as PdfTemplatePath,
        workspaceFolder,
        [],
    );
    const conversionPromises = outputPdfPaths.map(async (intermediatePdfPath: string) => {
        const svgPath = intermediatePdfPath.slice(0, -4) as SvgPath;
        await execFileInWorkspace(
            appConfig.execPathPdftocairo,
            [intermediatePdfPath, svgPath, '-svg'],
            workspaceFolder,
        );
        await vscode.workspace.fs.delete(vscode.Uri.file(intermediatePdfPath), {
            recursive: true,
            useTrash: false,
        });
        return svgPath;
    });

    return Promise.all(conversionPromises);
}
