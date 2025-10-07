import * as vscode from 'vscode';

import { AppConfig } from '../configuration';
import { splitPdf } from '../core/split_pdf';
import { JpegPath, JpegTemplatePath, PdfPath, PdfTemplatePath, PngPath, PngTemplatePath, SvgPath, SvgTemplatePath } from '../type';
import { execFileInWorkspace } from '../utils/exec_file_in_workspace';

export async function convertPdfToPng(
    appConfig: AppConfig,
    inputPath: PdfPath,
    outputTemplatePath: PngTemplatePath,
    workspaceFolder: vscode.WorkspaceFolder,
): Promise<PngPath[]> {
    const outputPaths: PngPath[] = [];

    const outputPdfPaths = await splitPdf(inputPath, (outputTemplatePath + '.pdf') as PdfTemplatePath, workspaceFolder, []);
    outputPdfPaths.forEach(async (path: string) => {
        await execFileInWorkspace(appConfig.execPathPdftocairo, [path, path.slice(0, -4), '-png', '-transp', '-singlefile'], workspaceFolder);
        await vscode.workspace.fs.rename(vscode.Uri.file(path.slice(0, -4) + '.png'), vscode.Uri.file(path.slice(0, -4)));
        await vscode.workspace.fs.delete(vscode.Uri.file(path), { recursive: true, useTrash: false });

        outputPaths.push(path.slice(0, -4) as PngPath);
    });

    return outputPaths;
}

export async function convertPdfToJpeg(
    appConfig: AppConfig,
    inputPath: PdfPath,
    outputTemplatePath: JpegTemplatePath,
    workspaceFolder: vscode.WorkspaceFolder,
): Promise<JpegPath[]> {
    const outputPaths: JpegPath[] = [];

    const outputPdfPaths = await splitPdf(inputPath, (outputTemplatePath + '.pdf') as PdfTemplatePath, workspaceFolder, []);
    outputPdfPaths.forEach(async (path: string) => {
        await execFileInWorkspace(appConfig.execPathPdftocairo, [path, path.slice(0, -4), '-jpeg', '-singlefile'], workspaceFolder);
        await vscode.workspace.fs.rename(vscode.Uri.file(path.slice(0, -4) + '.jpg'), vscode.Uri.file(path.slice(0, -4)));
        await vscode.workspace.fs.delete(vscode.Uri.file(path), { recursive: true, useTrash: false });

        outputPaths.push(path.slice(0, -4) as JpegPath);
    });

    return outputPaths;
}

export async function convertPdfToSvg(
    appConfig: AppConfig,
    inputPath: PdfPath,
    outputTemplatePath: SvgTemplatePath,
    workspaceFolder: vscode.WorkspaceFolder,
): Promise<SvgPath[]> {
    const outputPaths: SvgPath[] = [];

    const outputPdfPaths = await splitPdf(inputPath, (outputTemplatePath + '.pdf') as PdfTemplatePath, workspaceFolder, []);
    outputPdfPaths.forEach(async (path: string) => {
        await execFileInWorkspace(appConfig.execPathPdftocairo, [path, path.slice(0, -4), '-svg'], workspaceFolder);
        await vscode.workspace.fs.delete(vscode.Uri.file(path), { recursive: true, useTrash: false });

        outputPaths.push(path.slice(0, -4) as SvgPath);
    });

    return outputPaths;
}
