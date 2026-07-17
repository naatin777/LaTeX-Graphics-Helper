import * as vscode from 'vscode';

import type { AppConfig } from '../configuration';
import { getAppConfig } from '../configuration';
import { convertDrawioToPdf, convertDrawioToPdfDirectly } from '../core/convert_drawio_to_pdf';
import { localeMap } from '../locale_map';
import type { DrawioPath } from '../type';
import { processUrisWithProgress } from '../utils/process_urls_with_progress';

export function runConvertDrawioToPdfCommand(
    uri?: vscode.Uri,
    uris?: vscode.Uri[],
    appConfig: AppConfig = getAppConfig(),
) {
    if (!uri || !uris || uris.length === 0) {
        vscode.window.showErrorMessage(localeMap('noFilesSelected'));
        return;
    }

    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: localeMap('convertDrawioToPdfProcess'),
            cancellable: false,
        },
        async (progress) => {
            const error = await processUrisWithProgress(
                progress,
                uris,
                async (fileUri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
                    await convertDrawioToPdf(
                        appConfig,
                        fileUri.fsPath as DrawioPath,
                        appConfig.outputPathConvertDrawioToPdf,
                        workspaceFolder,
                    );
                },
            );
            error.forEach((value) => {
                vscode.window.showErrorMessage(`${value.reason.message}`);
            });
        },
    );
}

export function runConvertDrawioToPdfDirectlyCommand(
    uri?: vscode.Uri,
    uris?: vscode.Uri[],
    appConfig: AppConfig = getAppConfig(),
) {
    if (!uri || !uris || uris.length === 0) {
        vscode.window.showErrorMessage(localeMap('noFilesSelected'));
        return;
    }

    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: localeMap('convertDrawioToPdfDirectlyProcess'),
            cancellable: false,
        },
        async (progress) => {
            const error = await processUrisWithProgress(
                progress,
                uris,
                async (fileUri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
                    await convertDrawioToPdfDirectly(
                        appConfig,
                        fileUri.fsPath as DrawioPath,
                        appConfig.outputPathConvertDrawioToPdfDirectly,
                        workspaceFolder,
                    );
                },
            );
            error.forEach((value) => {
                vscode.window.showErrorMessage(`${value.reason.message}`);
            });
        },
    );
}
