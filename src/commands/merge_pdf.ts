import * as vscode from 'vscode';

import { mergePdf } from '../core/merge_pdf';
import { localeMap } from '../locale_map';
import { logger } from '../logger';
import type { PdfPath } from '../type';
import { reportNoFilesSelected } from '../utils/no_files_selected';

export async function runMergePdfCommand(uri?: vscode.Uri, uris?: vscode.Uri[]) {
    if (!uri || !uris || uris.length === 0) {
        reportNoFilesSelected('merge PDF');
        return;
    }

    try {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: localeMap('mergePdfProcess'),
                cancellable: false,
            },
            async (_progress) => {
                const outputPath = await vscode.window.showSaveDialog({
                    filters: { PDF: ['pdf'] },
                });
                const inputPaths = uris.map((fileUri) => fileUri.fsPath) as PdfPath[];
                if (outputPath) {
                    logger.info(`merging ${inputPaths.length} PDF(s) → ${outputPath.fsPath}`);
                    await mergePdf(inputPaths, outputPath.fsPath as PdfPath);
                } else {
                    logger.info('merge PDF cancelled: save dialog dismissed');
                }
            },
        );
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`merge PDF failed: ${error.message}`);
            vscode.window.showErrorMessage(`${error.message}`);
        }
    }
}
