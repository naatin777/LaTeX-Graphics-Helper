import { execFileSync } from 'child_process';

import * as vscode from 'vscode';

import { AppConfig, getAppConfig } from '../configuration';
import { localeMap } from '../locale_map';
import { runExplorerContextItem } from '../run_context_menu_item';
import { PdfOutputPath } from '../type';
import { createFolder, replaceOutputPath } from '../utils';

export function convertImageToPdf(uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder, outputPath: PdfOutputPath, config: AppConfig) {
    const replacedOutputPath = replaceOutputPath(uri.fsPath, outputPath, workspaceFolder);
    createFolder(replacedOutputPath);
    execFileSync(config.execPathInkscape, [uri.fsPath, '-o', replacedOutputPath, '--export-type=pdf', '--export-area-drawing'], { cwd: workspaceFolder.uri.fsPath });
}

export function runConvertPngToPdfCommand(uri: vscode.Uri, uris?: vscode.Uri[]) {
    if (!uris || uris.length === 0) {
        vscode.window.showErrorMessage(localeMap('noFilesSelected'));
        return;
    }
    runExplorerContextItem(uris, localeMap('convertPngToPdfProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
        convertImageToPdf(uri, workspaceFolder, getAppConfig().outputPathConvertPngToPdf, getAppConfig());
    });
}

export function runConvertJpegToPdfCommand(uri: vscode.Uri, uris?: vscode.Uri[]) {
    if (!uris || uris.length === 0) {
        vscode.window.showErrorMessage(localeMap('noFilesSelected'));
        return;
    }
    runExplorerContextItem(uris, localeMap('convertJpegToPdfProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
        convertImageToPdf(uri, workspaceFolder, getAppConfig().outputPathConvertJpegToPdf, getAppConfig());
    });
}

export function runConvertSvgToPdfCommand(uri: vscode.Uri, uris?: vscode.Uri[]) {
    if (!uris || uris.length === 0) {
        vscode.window.showErrorMessage(localeMap('noFilesSelected'));
        return;
    }
    runExplorerContextItem(uris, localeMap('convertSvgToPdfProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
        convertImageToPdf(uri, workspaceFolder, getAppConfig().outputPathConvertSvgToPdf, getAppConfig());
    });
}
