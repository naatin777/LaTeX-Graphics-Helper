import * as vscode from 'vscode';

export function runExplorerContextItem(uris: vscode.Uri[], title: string, task: (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => void) {
    if (!uris) {
        vscode.window.showErrorMessage('No files selected.');
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
                    throw new Error('Workspace folder not found.');
                }
            })
        );
        result.filter((value) => value.status === 'rejected').forEach((value) => {
            vscode.window.showErrorMessage(`${value.reason.toString()}`);
        });
    });
}
