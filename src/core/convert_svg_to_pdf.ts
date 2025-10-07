import puppeteer from 'puppeteer-core';
import * as vscode from 'vscode';

import { AppConfig } from '../configuration';
import { PdfTemplatePath, SvgPath } from '../type';
import { generatePathFromTemplate } from '../utils';

import { cropPdf } from './crop_pdf';

export async function convertSvgToPdf(appConfig: AppConfig, inputPath: SvgPath, outputTemplatePath: PdfTemplatePath, workspaceFolder: vscode.WorkspaceFolder) {
    const outputPath = generatePathFromTemplate(outputTemplatePath, inputPath, workspaceFolder);
    const svgContent = await vscode.workspace.fs.readFile(vscode.Uri.file(inputPath));

    let browser;
    let err;
    try {
        browser = await puppeteer.launch({
            browser: appConfig.puppeteerBrowser,
            channel: appConfig.puppeteerChannel,
            executablePath: appConfig.execPathPuppeteer
        });
        const page = await browser.newPage();
        await page.setContent(svgContent.toString(), { waitUntil: 'networkidle2' });
        await page.pdf({ path: outputPath });
        await cropPdf(appConfig, outputPath, outputPath, workspaceFolder);
    } catch (error) {
        if (error instanceof Error) {
            err = error;
        }
    } finally {
        if (browser) {
            await browser.close();
        }
    }
    if (err) {
        throw err;
    }
    return outputPath;
}
