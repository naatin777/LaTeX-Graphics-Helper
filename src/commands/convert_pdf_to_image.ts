import * as vscode from 'vscode';

import { AppConfig, getAppConfig } from '../configuration';
import { convertPdfToImage } from '../core/convert_pdf_to_image';
import { localeMap } from '../locale_map';
import { PdfPath } from '../type';
import { processUrisWithProgress } from '../utils/process_urls_with_progress';

export function runConvertPdfToPngCommand(
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
        title: localeMap('convertPdfToPngProcess'),
        cancellable: false
    }, async (progress) => {
        const error = await processUrisWithProgress(
            progress,
            uris,
            async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
                await convertPdfToImage(appConfig, uri.fsPath as PdfPath, appConfig.outputPathConvertPdfToPng, workspaceFolder);
            }
        );
        error.forEach((value) => {
            vscode.window.showErrorMessage(`${value.reason.toString()}`);
        });
    });
}

export function runConvertPdfToJpegCommand(
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
        title: localeMap('convertPdfToJpegProcess'),
        cancellable: false
    }, async (progress) => {
        const error = await processUrisWithProgress(
            progress,
            uris,
            async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
                await convertPdfToImage(appConfig, uri.fsPath as PdfPath, appConfig.outputPathConvertPdfToJpeg, workspaceFolder);
            }
        );
        error.forEach((value) => {
            vscode.window.showErrorMessage(`${value.reason.toString()}`);
        });
    });
}

export function runConvertPdfToSvgCommand(
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
        title: localeMap('convertPdfToSvgProcess'),
        cancellable: false
    }, async (progress) => {
        const error = await processUrisWithProgress(
            progress,
            uris,
            async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
                await convertPdfToImage(appConfig, uri.fsPath as PdfPath, appConfig.outputPathConvertPdfToSvg, workspaceFolder);
            }
        );
        error.forEach((value) => {
            vscode.window.showErrorMessage(`${value.reason.toString()}`);
        });
    });
}
