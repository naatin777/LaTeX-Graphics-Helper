import { PDFDocument } from 'pdf-lib';
import puppeteer from 'puppeteer-core';
import * as vscode from 'vscode';

import { getAppConfig } from '../configuration';
import { localeMap } from '../locale_map';
import { runExplorerContextItem } from '../run_context_menu_item';
import { PdfOutputPath } from '../type';
import { replaceOutputPath } from '../utils';

import { cropPdf } from './crop_pdf';

export async function convertBitmapToPdf(uri: vscode.Uri, outputPath: PdfOutputPath, workspaceFolder: vscode.WorkspaceFolder) {
    const replacedOutputPath = replaceOutputPath(uri.fsPath, outputPath, workspaceFolder);

    const pdfDoc = await PDFDocument.create();

    const imageBytes = await vscode.workspace.fs.readFile(uri);

    let image;
    if (uri.fsPath.toLowerCase().endsWith('.png')) {
        image = await pdfDoc.embedPng(imageBytes);
    } else if (uri.fsPath.toLowerCase().endsWith('.jpg') || uri.fsPath.toLowerCase().endsWith('.jpeg')) {
        image = await pdfDoc.embedJpg(imageBytes);
    }

    if (!image) {
        return;
    }

    const page = pdfDoc.addPage([image.width, image.height]);

    page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
    });

    const pdfBytes = await pdfDoc.save();
    await vscode.workspace.fs.writeFile(vscode.Uri.file(replacedOutputPath), pdfBytes);
}

export async function convertVectorToPdf(uri: vscode.Uri, outputPath: PdfOutputPath, workspaceFolder: vscode.WorkspaceFolder) {
    const replacedOutputPath = replaceOutputPath(uri.fsPath, outputPath, workspaceFolder);

    let browser;
    try {
        const svgContent = await vscode.workspace.fs.readFile(uri);

        browser = await puppeteer.launch({
            browser: 'chrome',
            channel: 'chrome'
        });

        const page = await browser.newPage();

        await page.setContent(svgContent.toString(), {
            waitUntil: 'networkidle2'
        });

        await page.pdf({
            path: replacedOutputPath,
        });
        cropPdf(vscode.Uri.file(replacedOutputPath), replacedOutputPath, workspaceFolder, getAppConfig());

    } catch (error) {
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

export function runConvertPngToPdfCommand(uri: vscode.Uri, uris?: vscode.Uri[]) {
    if (!uris || uris.length === 0) {
        vscode.window.showErrorMessage(localeMap('noFilesSelected'));
        return;
    }
    runExplorerContextItem(uris, localeMap('convertPngToPdfProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
        convertBitmapToPdf(uri, getAppConfig().outputPathConvertPngToPdf, workspaceFolder);
    });
}

export function runConvertJpegToPdfCommand(uri: vscode.Uri, uris?: vscode.Uri[]) {
    if (!uris || uris.length === 0) {
        vscode.window.showErrorMessage(localeMap('noFilesSelected'));
        return;
    }
    runExplorerContextItem(uris, localeMap('convertJpegToPdfProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
        convertBitmapToPdf(uri, getAppConfig().outputPathConvertJpegToPdf, workspaceFolder);
    });
}

export function runConvertSvgToPdfCommand(uri: vscode.Uri, uris?: vscode.Uri[]) {
    if (!uris || uris.length === 0) {
        vscode.window.showErrorMessage(localeMap('noFilesSelected'));
        return;
    }
    runExplorerContextItem(uris, localeMap('convertSvgToPdfProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
        convertVectorToPdf(uri, getAppConfig().outputPathConvertSvgToPdf, workspaceFolder);
    });
}
