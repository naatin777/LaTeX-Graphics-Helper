import puppeteer from 'puppeteer-core';
import * as vscode from 'vscode';

import { getAppConfig } from '../configuration';
import { cropPdf } from '../core/crop_pdf';
import { Path, PdfPath, PdfTemplatePath } from '../type';
import { generatePathFromTemplate } from '../utils';

export async function convertVectorToPdf(uri: vscode.Uri, outputPath: PdfTemplatePath, workspaceFolder: vscode.WorkspaceFolder) {
    const replacedOutputPath = generatePathFromTemplate(outputPath, uri.fsPath as Path, workspaceFolder) as PdfPath;

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
        await cropPdf(getAppConfig(), replacedOutputPath, replacedOutputPath, workspaceFolder);

    } catch (error) {
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
