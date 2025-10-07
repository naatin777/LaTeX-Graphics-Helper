import * as vscode from 'vscode';

import { getAppConfig } from '../configuration';
import { PDFTOCAIRO_JPEG_OPTIONS, PDFTOCAIRO_PNG_OPTIONS, PDFTOCAIRO_SVG_OPTIONS } from '../constants';
import { convertPdfToImage } from '../core/convert_pdf_to_image';
import { localeMap } from '../locale_map';
import { processUrisWithProgress } from '../utils/process_urls_with_progress';

export function runConvertPdfToPngCommand(uri: vscode.Uri, uris?: vscode.Uri[]) {
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
                await convertPdfToImage(uri, workspaceFolder, getAppConfig().outputPathConvertPdfToPng, PDFTOCAIRO_PNG_OPTIONS, getAppConfig());
            }
        );
        error.forEach((value) => {
            vscode.window.showErrorMessage(`${value.reason.toString()}`);
        });
    });
}

export function runConvertPdfToJpegCommand(uri: vscode.Uri, uris?: vscode.Uri[]) {
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
                await convertPdfToImage(uri, workspaceFolder, getAppConfig().outputPathConvertPdfToJpeg, PDFTOCAIRO_JPEG_OPTIONS, getAppConfig());
            }
        );
        error.forEach((value) => {
            vscode.window.showErrorMessage(`${value.reason.toString()}`);
        });
    });
}

export function runConvertPdfToSvgCommand(uri: vscode.Uri, uris?: vscode.Uri[]) {
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
                await convertPdfToImage(uri, workspaceFolder, getAppConfig().outputPathConvertPdfToSvg, PDFTOCAIRO_SVG_OPTIONS, getAppConfig());
            }
        );
        error.forEach((value) => {
            vscode.window.showErrorMessage(`${value.reason.toString()}`);
        });
    });
}
