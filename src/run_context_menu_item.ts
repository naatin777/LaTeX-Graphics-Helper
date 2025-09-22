import * as vscode from 'vscode';

import { localeMap } from './locale_map';

export function runExplorerContextItem(uris: vscode.Uri[], title: string, task: (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => void) {
    if (!uris) {
        vscode.window.showErrorMessage(localeMap('noFilesSelected'));
        return;
    }

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: title,
        cancellable: false
    }, async (progress) => {
        const result = await Promise.allSettled(
            uris.map(async (uri: vscode.Uri) => {
                const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
                if (workspaceFolder) {
                    await task(uri, workspaceFolder);
                } else {
                    throw new Error(localeMap('workspaceFolderNotFound'));
                }
            })
        );
        result.filter((value) => value.status === 'rejected').forEach((value) => {
            vscode.window.showErrorMessage(`${value.reason.toString()}`);
        });
    });
}
