import { execFileSync } from 'child_process';

import * as vscode from 'vscode';

import { AppConfig, getAppConfig } from '../configuration';
import { localeMap } from '../locale_map';
import { runExplorerContextItem } from '../run_context_menu_item';
import { createFolder, replaceOutputPath } from '../utils';

export function cropPdf(uri: vscode.Uri, outputPath: string, workspaceFolder: vscode.WorkspaceFolder, config: AppConfig): void {
    const replacedOutputPath = replaceOutputPath(uri.fsPath, outputPath, workspaceFolder);
    createFolder(replacedOutputPath);
    execFileSync(config.execPathPdfcrop, [uri.fsPath, replacedOutputPath], { cwd: workspaceFolder.uri.fsPath });
}

export function runCropPdfCommand(_: vscode.Uri, uris?: vscode.Uri[]) {
    if (!uris || uris.length === 0) {
        vscode.window.showErrorMessage(localeMap('noFilesSelected'));
        return;
    }

    runExplorerContextItem(uris, localeMap('cropPdfProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
        cropPdf(uri, getAppConfig().outputPathCropPdf, workspaceFolder, getAppConfig());
    });

    // vscode.window.withProgress({
    //     location: vscode.ProgressLocation.Notification,
    //     title: title,
    //     cancellable: false
    // }, async (progress) => {
    //     const result = await Promise.allSettled(
    //         uris.map(async (uri: vscode.Uri) => {
    //             const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    //             if (workspaceFolder) {
    //                 await task(uri, workspaceFolder);
    //             } else {
    //                 throw new Error(localeMap('workspaceFolderNotFound'));
    //             }
    //         })
    //     );
    //     result.filter((value) => value.status === 'rejected').forEach((value) => {
    //         vscode.window.showErrorMessage(`${value.reason.toString()}`);
    //     });
    // });

    // runExplorerContextItem(uris, localeMap('cropPdfProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
    //     cropPdf(uri, workspaceFolder, config);
    // });
}
