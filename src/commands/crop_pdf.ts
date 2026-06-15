import * as vscode from 'vscode';

import type { AppConfig } from '../configuration';
import { getAppConfig } from '../configuration';
import { cropPdf } from '../core/crop_pdf';
import { localeMap } from '../locale_map';
import type { PdfPath } from '../type';
import { reportNoFilesSelected } from '../utils/no_files_selected';
import { processUrisWithProgress } from '../utils/process_urls_with_progress';

export function runCropPdfCommand(
    uri?: vscode.Uri,
    uris?: vscode.Uri[],
    appConfig: AppConfig = getAppConfig(),
) {
    if (!uri || !uris || uris.length === 0) {
        reportNoFilesSelected('crop PDF');
        return;
    }

    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: localeMap('cropPdfProcess'),
            cancellable: false,
        },
        async (progress) => {
            const error = await processUrisWithProgress(
                progress,
                uris,
                async (fileUri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
                    await cropPdf(
                        appConfig,
                        fileUri.fsPath as PdfPath,
                        appConfig.outputPathCropPdf,
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
