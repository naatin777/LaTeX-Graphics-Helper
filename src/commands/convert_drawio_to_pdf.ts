import * as vscode from 'vscode';

import type { AppConfig } from '../configuration';
import { getAppConfig } from '../configuration';
import { convertDrawioToPdf } from '../core/convert_drawio_to_pdf';
import { localeMap } from '../locale_map';
import type { DrawioPath } from '../type';
import { reportNoFilesSelected } from '../utils/no_files_selected';
import { processUrisWithProgress } from '../utils/process_urls_with_progress';

export function runConvertDrawioToPdfCommand(
    uri?: vscode.Uri,
    uris?: vscode.Uri[],
    appConfig: AppConfig = getAppConfig(),
) {
    if (!uri || !uris || uris.length === 0) {
        reportNoFilesSelected('convert Draw.io to PDF');
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
