import { launch } from 'puppeteer-core';
import * as vscode from 'vscode';

import type { AppConfig } from '../configuration';
import type { PdfTemplatePath, SvgPath } from '../type';
import { generatePathFromTemplate } from '../utils/generate_path_from_template';
import { cropPdf } from './crop_pdf';

export async function convertSvgToPdf(
    appConfig: AppConfig,
    inputPath: SvgPath,
    outputTemplatePath: PdfTemplatePath,
    workspaceFolder: vscode.WorkspaceFolder,
) {
    const outputPath = generatePathFromTemplate(outputTemplatePath, inputPath, workspaceFolder);
    const svgContent = await vscode.workspace.fs.readFile(vscode.Uri.file(inputPath));

    let browser;
    try {
        browser = await launch({
            browser: appConfig.puppeteerBrowser,
            channel: appConfig.puppeteerChannel,
            executablePath: appConfig.execPathPuppeteer,
        });
        const page = await browser.newPage();
        await page.setContent(svgContent.toString(), { waitUntil: 'networkidle2' });
        await page.pdf({ path: outputPath });
        await cropPdf(appConfig, outputPath, outputPath, workspaceFolder);
    } catch (error) {
        throw error instanceof Error ? error : new Error(String(error));
    } finally {
        if (browser) {
            await browser.close();
        }
    }
    return outputPath;
}
