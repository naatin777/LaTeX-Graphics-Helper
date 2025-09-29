import * as vscode from 'vscode';

import { localeMap } from '../locale_map';

async function processUrisWithProgress(
    uris: vscode.Uri[],
    task: (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => Promise<void>,
    progress: vscode.Progress<{ message?: string; increment?: number }>
): Promise<{ uri: vscode.Uri, reason: any }[]> {
    const errors: { uri: vscode.Uri, reason: any }[] = [];
    const increment = 100 / uris.length;
    let completedCount = 0;

    const promises = uris.map(async (uri) => {
        try {
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
            if (workspaceFolder) {
                await task(uri, workspaceFolder);
            } else {
                throw new Error(localeMap('workspaceFolderNotFound'));
            }
        } catch (error) {
            errors.push({ uri, reason: error });
        } finally {
            completedCount++;
            const fileName = uri.path.split('/').pop();
            progress.report({ increment, message: `${completedCount}/${uris.length}: ${fileName}` });
        }
    });

    await Promise.all(promises);
    return errors;
}
