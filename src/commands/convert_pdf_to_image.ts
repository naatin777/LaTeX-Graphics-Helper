import { execFileSync } from 'child_process';

import * as vscode from 'vscode';

import { AppConfig, getAppConfig } from '../configuration';
import { PDFTOCAIRO_JPEG_OPTIONS, PDFTOCAIRO_PNG_OPTIONS, PDFTOCAIRO_SVG_OPTIONS } from '../constants';
import { localeMap } from '../locale_map';
import { runExplorerContextItem } from '../run_context_menu_item';
import { ImageOutputPath, PdftocairoOptions } from '../type';

import { splitPdf } from './split_pdf';

export async function convertPdfToImage(uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder, outputPath: ImageOutputPath, options: PdftocairoOptions, config: AppConfig) {
    const outputPaths = await splitPdf(uri.fsPath, `${outputPath}.pdf`, workspaceFolder, []);
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

export function runConvertPdfToPngCommand(uri: vscode.Uri, uris?: vscode.Uri[]) {
    if (!uris || uris.length === 0) {
        vscode.window.showErrorMessage(localeMap('noFilesSelected'));
        return;
    }

    runExplorerContextItem(uris, localeMap('convertPdfToPngProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
        convertPdfToImage(uri, workspaceFolder, getAppConfig().outputPathConvertPdfToPng, PDFTOCAIRO_PNG_OPTIONS, getAppConfig());
    });
}

export function runConvertPdfToJpegCommand(uri: vscode.Uri, uris?: vscode.Uri[]) {
    if (!uris || uris.length === 0) {
        vscode.window.showErrorMessage(localeMap('noFilesSelected'));
        return;
    }

    runExplorerContextItem(uris, localeMap('convertPdfToJpegProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
        convertPdfToImage(uri, workspaceFolder, getAppConfig().outputPathConvertPdfToJpeg, PDFTOCAIRO_JPEG_OPTIONS, getAppConfig());
    });
}

export function runConvertPdfToSvgCommand(uri: vscode.Uri, uris?: vscode.Uri[]) {
    if (!uris || uris.length === 0) {
        vscode.window.showErrorMessage(localeMap('noFilesSelected'));
        return;
    }

    runExplorerContextItem(uris, localeMap('convertPdfToSvgProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
        convertPdfToImage(uri, workspaceFolder, getAppConfig().outputPathConvertPdfToSvg, PDFTOCAIRO_SVG_OPTIONS, getAppConfig());
    });
}
