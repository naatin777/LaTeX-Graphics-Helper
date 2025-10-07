import * as vscode from 'vscode';

import { AppConfig, getAppConfig } from '../configuration';
import { convertBitmapToPdf } from '../core/convert_bitmap_to_pdf';
import { convertVectorToPdf } from '../core/convert_vector_to_pdf';
import { localeMap } from '../locale_map';
import { BitmapPath } from '../type';
import { processUrisWithProgress } from '../utils/process_urls_with_progress';

export function runConvertPngToPdfCommand(
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
        title: localeMap('convertPngToPdfProcess'),
        cancellable: false
    }, async (progress) => {
        const error = await processUrisWithProgress(
            progress,
            uris,
            async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
                await convertBitmapToPdf(
                    uri.fsPath as BitmapPath,
                    appConfig.outputPathConvertPngToPdf,
                    workspaceFolder
                );
            }
        );
        error.forEach((value) => {
            vscode.window.showErrorMessage(`${value.reason.toString()}`);
        });
    });
}

export function runConvertJpegToPdfCommand(
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
        title: localeMap('convertJpegToPdfProcess'),
        cancellable: false
    }, async (progress) => {
        const error = await processUrisWithProgress(
            progress,
            uris,
            async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
                await convertBitmapToPdf(
                    uri.fsPath as BitmapPath,
                    appConfig.outputPathConvertJpegToPdf,
                    workspaceFolder
                );
            }
        );
        error.forEach((value) => {
            vscode.window.showErrorMessage(`${value.reason.toString()}`);
        });
    });
}

export function runConvertSvgToPdfCommand(
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
        title: localeMap('convertSvgToPdfProcess'),
        cancellable: false
    }, async (progress) => {
        const error = await processUrisWithProgress(
            progress,
            uris,
            async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
                await convertVectorToPdf(
                    uri,
                    appConfig.outputPathConvertSvgToPdf,
                    workspaceFolder
                );
            }
        );
        error.forEach((value) => {
            vscode.window.showErrorMessage(`${value.reason.toString()}`);
        });
    });
}
