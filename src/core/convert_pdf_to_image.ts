import * as vscode from 'vscode';

import { AppConfig } from '../configuration';
import { splitPdf } from '../core/split_pdf';
import { JpegTemplatePath, PdfPath, PdfTemplatePath, PngTemplatePath, SvgTemplatePath } from '../type';
import { execFileInWorkspace } from '../utils/exec_file_in_workspace';

export async function convertPdfToPng(
    appConfig: AppConfig,
    inputPath: PdfPath,
    outputTemplatePath: PngTemplatePath,
    workspaceFolder: vscode.WorkspaceFolder,
) {
    const outputPaths = await splitPdf(inputPath, (outputTemplatePath + '.pdf') as PdfTemplatePath, workspaceFolder, []);
    outputPaths.forEach((path: string) => {
        execFileInWorkspace(appConfig.execPathPdftocairo, [path, path.slice(0, -4), '-png', '-transp', '-singlefile'], workspaceFolder);
        vscode.workspace.fs.rename(vscode.Uri.file(path.slice(0, -4) + '.png'), vscode.Uri.file(path.slice(0, -4).slice(0, -4)));
        vscode.workspace.fs.delete(vscode.Uri.file(path), { recursive: true, useTrash: false });
    });
}

export async function convertPdfToJpeg(
    appConfig: AppConfig,
    inputPath: PdfPath,
    outputTemplatePath: JpegTemplatePath,
    workspaceFolder: vscode.WorkspaceFolder,
) {
    const outputPaths = await splitPdf(inputPath, (outputTemplatePath + '.pdf') as PdfTemplatePath, workspaceFolder, []);
    outputPaths.forEach((path: string) => {
        execFileInWorkspace(appConfig.execPathPdftocairo, [path, path.slice(0, -4), '-jpeg', '-singlefile'], workspaceFolder);
        vscode.workspace.fs.rename(vscode.Uri.file(path.slice(0, -4) + '.jpeg'), vscode.Uri.file(path.slice(0, -4).slice(0, -4)));
        vscode.workspace.fs.delete(vscode.Uri.file(path), { recursive: true, useTrash: false });
    });
}

export async function convertPdfToSvg(
    appConfig: AppConfig,
    inputPath: PdfPath,
    outputTemplatePath: SvgTemplatePath,
    workspaceFolder: vscode.WorkspaceFolder,
) {
    const outputPaths = await splitPdf(inputPath, (outputTemplatePath + '.pdf') as PdfTemplatePath, workspaceFolder, []);
    outputPaths.forEach((path: string) => {
        execFileInWorkspace(appConfig.execPathPdftocairo, [path, path.slice(0, -4), '-svg'], workspaceFolder);
        vscode.workspace.fs.delete(vscode.Uri.file(path), { recursive: true, useTrash: false });
    });
}
