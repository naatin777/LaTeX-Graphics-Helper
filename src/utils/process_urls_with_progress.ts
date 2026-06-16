import * as vscode from 'vscode';

import { localeMap } from '../locale_map';
import { logger } from '../logger';

export async function processUrisWithProgress(
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    uris: vscode.Uri[],
    task: (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => Promise<void>,
): Promise<{ uri: vscode.Uri; reason: Error }[]> {
    const errors: { uri: vscode.Uri; reason: Error }[] = [];
    const increment = 100 / uris.length;
    let completedCount = 0;

    logger.info(`processing ${uris.length} file(s)`);

    // ponytail: serial batch — parallel pdfcrop/gs overwhelmed macOS CI extension host
    for (const uri of uris) {
        try {
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
            if (workspaceFolder) {
                await task(uri, workspaceFolder);
            } else {
                throw new Error(localeMap('workspaceFolderNotFound'));
            }
        } catch (error) {
            if (error instanceof Error) {
                logger.error(`failed ${uri.fsPath}: ${error.message}`);
                errors.push({ uri, reason: error });
            }
        } finally {
            completedCount++;
            const fileName = uri.path.split('/').pop();
            progress.report({
                increment,
                message: `${completedCount}/${uris.length}: ${fileName}`,
            });
        }
    }

    return errors;
}
