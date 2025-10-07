import { execFileSync } from 'child_process';

import * as vscode from 'vscode';

import { AppConfig } from '../configuration';
import { PDFTOCAIRO_JPEG_OPTIONS, PDFTOCAIRO_PNG_OPTIONS, PDFTOCAIRO_SVG_OPTIONS } from '../constants';
import { splitPdf } from '../core/split_pdf';
import { JpegTemplatePath, PdfPath, PdfTemplatePath, PdftocairoOptions, PngTemplatePath, SvgTemplatePath } from '../type';

export async function convertPdfToImage(
    appConfig: AppConfig,
    inputPath: PdfPath,
    outputTemplatePath: PngTemplatePath | JpegTemplatePath | SvgTemplatePath,
    workspaceFolder: vscode.WorkspaceFolder,
    options: PdftocairoOptions
) {
    const outputPaths = await splitPdf(inputPath, (outputTemplatePath + '.pdf') as PdfTemplatePath, workspaceFolder, []);
    outputPaths.forEach((path: string) => {
        if (options === PDFTOCAIRO_PNG_OPTIONS) {
            execFileSync(appConfig.execPathPdftocairo, [path, path + '.png', ...options], { cwd: workspaceFolder.uri.fsPath });
        } else if (options === PDFTOCAIRO_JPEG_OPTIONS) {
            execFileSync(appConfig.execPathPdftocairo, [path, path + '.jpeg', ...options], { cwd: workspaceFolder.uri.fsPath });
        } else if (options === PDFTOCAIRO_SVG_OPTIONS) {
            execFileSync(appConfig.execPathPdftocairo, [path, path + '.svg', ...options], { cwd: workspaceFolder.uri.fsPath });
        }
        vscode.workspace.fs.delete(vscode.Uri.file(path), { recursive: true, useTrash: false });
    });
}
