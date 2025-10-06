import * as vscode from 'vscode';

import { mergePdf } from '../core/merge_pdf';
import { localeMap } from '../locale_map';
import { PdfPath } from '../type';

export async function runMergePdfCommand(uri: vscode.Uri, uris?: vscode.Uri[]) {
    if (!uri || !uris || uris.length === 0) {
        vscode.window.showErrorMessage(localeMap('noFilesSelected'));
        return;
    }

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: localeMap('mergePdfProcess'),
            cancellable: false
        }, async (progress) => {
            const outputPath = await vscode.window.showSaveDialog({ filters: { 'PDF': ['pdf'] }, });
            const inputPaths = uris.map((uri) => uri.fsPath) as PdfPath[];
            if (outputPath) {
                await mergePdf(inputPaths, outputPath.fsPath as PdfPath);
            }
        });
    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`${error.message.toString()}`);
        }
    }
}
