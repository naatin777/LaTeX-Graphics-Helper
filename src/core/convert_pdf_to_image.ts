import { execFileSync } from 'child_process';

import * as vscode from 'vscode';

import { AppConfig } from '../configuration';
import { PDFTOCAIRO_JPEG_OPTIONS, PDFTOCAIRO_PNG_OPTIONS, PDFTOCAIRO_SVG_OPTIONS } from '../constants';
import { splitPdf } from '../core/split_pdf';
import { JpegTemplatePath, PdfPath, PdfTemplatePath, PdftocairoOptions, PngTemplatePath, SvgTemplatePath } from '../type';

export async function convertPdfToImage(uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder, outputPath: PngTemplatePath | JpegTemplatePath | SvgTemplatePath, options: PdftocairoOptions, config: AppConfig) {
    const outputPaths = await splitPdf(uri.fsPath as PdfPath, (outputPath + '.pdf') as PdfTemplatePath, workspaceFolder, []);
    outputPaths.forEach((path: string) => {
        try {
            if (options === PDFTOCAIRO_PNG_OPTIONS) {
                execFileSync(config.execPathPdftocairo, [path, path + '.png', ...options], { cwd: workspaceFolder.uri.fsPath });
            } else if (options === PDFTOCAIRO_JPEG_OPTIONS) {
                execFileSync(config.execPathPdftocairo, [path, path + '.jpeg', ...options], { cwd: workspaceFolder.uri.fsPath });
            } else if (options === PDFTOCAIRO_SVG_OPTIONS) {
                execFileSync(config.execPathPdftocairo, [path, path + '.svg', ...options], { cwd: workspaceFolder.uri.fsPath });
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(error.toString());
        }

        vscode.workspace.fs.delete(vscode.Uri.file(path), { recursive: true, useTrash: false });
    });
}
