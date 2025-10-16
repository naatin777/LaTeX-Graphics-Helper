import * as vscode from 'vscode';

import { AppConfig, getAppConfig } from '../configuration';
import { cropPdf } from '../core/crop_pdf';
import { localeMap } from '../locale_map';
import { PdfPath } from '../type';
import { processUrisWithProgress } from '../utils/process_urls_with_progress';

export function runCropPdfCommand(
    uri?: vscode.Uri,
    uris?: vscode.Uri[],
    appConfig: AppConfig = getAppConfig()
) {
    if (!uri || !uris || uris.length === 0) {
        vscode.window.showErrorMessage(localeMap('noFilesSelected'));
        return;
    }

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localeMap('cropPdfProcess'),
        cancellable: false
    }, async (progress) => {
        const error = await processUrisWithProgress(
            progress,
            uris,
            async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
                await cropPdf(
                    appConfig,
                    uri.fsPath as PdfPath,
                    appConfig.outputPathCropPdf,
                    workspaceFolder
                );
            }
        );
        error.forEach((value) => {
            vscode.window.showErrorMessage(`${value.reason.message}`);
        });
    });
}
