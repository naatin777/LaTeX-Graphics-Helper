import { execFileSync } from 'child_process';

import * as vscode from 'vscode';

import { AppConfig, getAppConfig } from '../configuration';
import { PDFTOCAIRO_JPEG_OPTIONS, PDFTOCAIRO_PNG_OPTIONS, PDFTOCAIRO_SVG_OPTIONS } from '../constants';
import { localeMap } from '../locale_map';
import { runExplorerContextItem } from '../run_context_menu_item';
import { ImageOutputPath, PdftocairoOptions } from '../type';
import { createFolder, replaceOutputPath } from '../utils';

import { splitPdf } from './split_pdf';

export async function convertPdfToImage(inputPath: string, workspaceFolder: vscode.WorkspaceFolder, outputPath: ImageOutputPath, options: PdftocairoOptions, config: AppConfig) {
    const outputPaths = await splitPdf(inputPath, outputPath, workspaceFolder, []);

    outputPaths.forEach((path: string) => {
        const replacedOutputPath = replaceOutputPath(inputPath, path, workspaceFolder);
        createFolder(replacedOutputPath);

        execFileSync(config.execPathPdftocairo, [inputPath, replacedOutputPath, ...options], { cwd: workspaceFolder.uri.fsPath });
    });
}

export function runConvertPdfToPngCommand(uri: vscode.Uri, uris?: vscode.Uri[]) {
    if (!uris || uris.length === 0) {
        vscode.window.showErrorMessage(localeMap('noFilesSelected'));
        return;
    }

    runExplorerContextItem(uris, localeMap('convertPdfToPngProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
        const outputPaths = await splitPdf(uri.fsPath, `${uri.fsPath}-{tab}.pdf`, workspaceFolder);
        const promises = outputPaths.map(async (path) => convertPdfToImage(path, workspaceFolder, getAppConfig().outputPathConvertPdfToPng, PDFTOCAIRO_PNG_OPTIONS, getAppConfig()));
        await Promise.all(promises);
    });
}

export function runConvertPdfToJpegCommand(uri: vscode.Uri, uris?: vscode.Uri[]) {
    if (!uris || uris.length === 0) {
        vscode.window.showErrorMessage(localeMap('noFilesSelected'));
        return;
    }

    runExplorerContextItem(uris, localeMap('convertPdfToJpegProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
        const outputPaths = await splitPdf(uri.fsPath, `${uri.fsPath}-{tab}.pdf`, workspaceFolder);
        const promises = outputPaths.map(async (path) => convertPdfToImage(path, workspaceFolder, getAppConfig().outputPathConvertPdfToJpeg, PDFTOCAIRO_JPEG_OPTIONS, getAppConfig()));
        await Promise.all(promises);
    });
}

export function runConvertPdfToSvgCommand(uri: vscode.Uri, uris?: vscode.Uri[]) {
    if (!uris || uris.length === 0) {
        vscode.window.showErrorMessage(localeMap('noFilesSelected'));
        return;
    }

    runExplorerContextItem(uris, localeMap('convertPdfToSvgProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
        const outputPaths = await splitPdf(uri.fsPath, `${uri.fsPath}-{tab}.pdf`, workspaceFolder);
        const promises = outputPaths.map(async (path) => convertPdfToImage(path, workspaceFolder, getAppConfig().outputPathConvertPdfToSvg, PDFTOCAIRO_SVG_OPTIONS, getAppConfig()));
        await Promise.all(promises);
    });
}
