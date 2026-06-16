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
    const outputPaths: PngPath[] = [];

    // ponytail: serial pages — parallel pdftocairo races on Windows CI
    for (const intermediatePdfPath of outputPdfPaths) {
        const imagePath = intermediatePdfPath.slice(0, -4);
        await execFileInWorkspace(
            appConfig.execPathPdftocairo,
            [intermediatePdfPath, imagePath, '-png', '-transp', '-singlefile'],
            workspaceFolder,
        );
        await vscode.workspace.fs.rename(
            vscode.Uri.file(`${imagePath}.png`),
            vscode.Uri.file(imagePath),
            { overwrite: true },
        );
        await vscode.workspace.fs.delete(vscode.Uri.file(intermediatePdfPath), {
            recursive: true,
            useTrash: false,
        });
        outputPaths.push(imagePath as PngPath);
    }

    return outputPaths;
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
    const outputPaths: JpegPath[] = [];

    for (const intermediatePdfPath of outputPdfPaths) {
        const imagePath = intermediatePdfPath.slice(0, -4);
        await execFileInWorkspace(
            appConfig.execPathPdftocairo,
            [intermediatePdfPath, imagePath, '-jpeg', '-singlefile'],
            workspaceFolder,
        );
        await vscode.workspace.fs.rename(
            vscode.Uri.file(`${imagePath}.jpg`),
            vscode.Uri.file(imagePath),
            { overwrite: true },
        );
        await vscode.workspace.fs.delete(vscode.Uri.file(intermediatePdfPath), {
            recursive: true,
            useTrash: false,
        });
        outputPaths.push(imagePath as JpegPath);
    }

    return outputPaths;
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
    const outputPaths: SvgPath[] = [];

    for (const intermediatePdfPath of outputPdfPaths) {
        const imagePath = intermediatePdfPath.slice(0, -4);
        await execFileInWorkspace(
            appConfig.execPathPdftocairo,
            [intermediatePdfPath, imagePath, '-svg'],
            workspaceFolder,
        );
        await vscode.workspace.fs.delete(vscode.Uri.file(intermediatePdfPath), {
            recursive: true,
            useTrash: false,
        });
        outputPaths.push(imagePath as SvgPath);
    }

    return outputPaths;
}
