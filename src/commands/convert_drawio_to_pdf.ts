import * as vscode from 'vscode';

import { AppConfig, getAppConfig } from '../configuration';
import { convertDrawioToPdf } from '../core/convert_drawio_to_pdf';
import { localeMap } from '../locale_map';
import { DrawioPath } from '../type';
import { processUrisWithProgress } from '../utils/process_urls_with_progress';

export function runConvertDrawioToPdfCommand(
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
        title: localeMap('convertDrawioToPdfProcess'),
        cancellable: false
    }, async (progress) => {
        const error = await processUrisWithProgress(
            progress,
            uris,
            async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
                await convertDrawioToPdf(appConfig, uri.fsPath as DrawioPath, appConfig.outputPathConvertDrawioToPdf, workspaceFolder);
            }
        );
        error.forEach((value) => {
            vscode.window.showErrorMessage(`${value.reason.toString()}`);
        });
    });
}
