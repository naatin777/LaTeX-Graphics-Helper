import * as vscode from 'vscode';

import type { AppConfig } from '../configuration';
import { getAppConfig } from '../configuration';
import { convertBitmapToPdf } from '../core/convert_bitmap_to_pdf';
import { convertSvgToPdf } from '../core/convert_svg_to_pdf';
import { localeMap } from '../locale_map';
import type { JpegPath, PngPath, SvgPath } from '../type';
import { reportNoFilesSelected } from '../utils/no_files_selected';
import { processUrisWithProgress } from '../utils/process_urls_with_progress';

export function runConvertPngToPdfCommand(
    uri?: vscode.Uri,
    uris?: vscode.Uri[],
    appConfig: AppConfig = getAppConfig(),
) {
    if (!uri || !uris || uris.length === 0) {
        reportNoFilesSelected('convert PNG to PDF');
        return;
    }

    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: localeMap('convertPngToPdfProcess'),
            cancellable: false,
        },
        async (progress) => {
            const error = await processUrisWithProgress(
                progress,
                uris,
                async (fileUri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
                    await convertBitmapToPdf(
                        fileUri.fsPath as PngPath,
                        appConfig.outputPathConvertPngToPdf,
                        workspaceFolder,
                        'png',
                    );
                },
            );
            error.forEach((value) => {
                vscode.window.showErrorMessage(`${value.reason.message}`);
            });
        },
    );
}

export function runConvertJpegToPdfCommand(
    uri?: vscode.Uri,
    uris?: vscode.Uri[],
    appConfig: AppConfig = getAppConfig(),
) {
    if (!uri || !uris || uris.length === 0) {
        reportNoFilesSelected('convert JPEG to PDF');
        return;
    }

    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: localeMap('convertJpegToPdfProcess'),
            cancellable: false,
        },
        async (progress) => {
            const error = await processUrisWithProgress(
                progress,
                uris,
                async (fileUri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
                    await convertBitmapToPdf(
                        fileUri.fsPath as JpegPath,
                        appConfig.outputPathConvertJpegToPdf,
                        workspaceFolder,
                        'jpeg',
                    );
                },
            );
            error.forEach((value) => {
                vscode.window.showErrorMessage(`${value.reason.message}`);
            });
        },
    );
}

export function runConvertSvgToPdfCommand(
    uri?: vscode.Uri,
    uris?: vscode.Uri[],
    appConfig: AppConfig = getAppConfig(),
) {
    if (!uri || !uris || uris.length === 0) {
        reportNoFilesSelected('convert SVG to PDF');
        return;
    }

    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: localeMap('convertSvgToPdfProcess'),
            cancellable: false,
        },
        async (progress) => {
            const error = await processUrisWithProgress(
                progress,
                uris,
                async (fileUri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
                    await convertSvgToPdf(
                        appConfig,
                        fileUri.fsPath as SvgPath,
                        appConfig.outputPathConvertSvgToPdf,
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
