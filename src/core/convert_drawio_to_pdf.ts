import { randomUUID } from 'node:crypto';
import { unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import * as vscode from 'vscode';
import { Parser } from 'xml2js';

import type { AppConfig } from '../configuration';
import type { DrawioPath, PdfPath, PdfTemplatePath } from '../type';
import { createFolder } from '../utils/create_folder';
import { execFileInWorkspace } from '../utils/exec_file_in_workspace';
import { generatePathFromTemplate } from '../utils/generate_path_from_template';
import { cropPdf } from './crop_pdf';
import { splitPdf } from './split_pdf';

async function getDrawioTabs(inputPath: DrawioPath): Promise<string[]> {
    const xmlData = await vscode.workspace.fs.readFile(vscode.Uri.file(inputPath));
    const parser = new Parser();
    const result = await parser.parseStringPromise(xmlData.toString());
    const diagrams = result.mxfile.diagram;
    return diagrams.map((diagram: any) => diagram.$.name);
}

function isEditableDrawioImage(inputPath: DrawioPath): boolean {
    const fileName = path.basename(inputPath).toLowerCase();
    return /\.(drawio|dio)\.(png|svg)$/.test(fileName);
}

function getDrawioOutputBasePath(inputPath: DrawioPath): string {
    if (isEditableDrawioImage(inputPath)) {
        return inputPath.replace(/\.(drawio|dio)\.(png|svg)$/i, '');
    }

    const parsedPath = path.parse(inputPath);
    return path.join(parsedPath.dir, parsedPath.name);
}

export async function convertDrawioToPdf(
    appConfig: AppConfig,
    inputPath: DrawioPath,
    outputTemplatePath: PdfTemplatePath,
    workspaceFolder: vscode.WorkspaceFolder,
): Promise<PdfPath[]> {
    const outputBasePath = getDrawioOutputBasePath(inputPath);
    const logicalPdfPath = `${outputBasePath}.pdf` as PdfPath;
    const temporaryPaths: string[] = [];

    async function reserveTemporaryPath(extension: string): Promise<string> {
        const temporaryPath = path.join(
            path.dirname(inputPath),
            `.latex-graphics-helper-${randomUUID()}${extension}`,
        );
        await writeFile(temporaryPath, '', { flag: 'wx' });
        temporaryPaths.push(temporaryPath);
        return temporaryPath;
    }

    try {
        const temporaryPdfPath = (await reserveTemporaryPath('.pdf')) as PdfPath;
        let conversionInputPath = inputPath;

        if (isEditableDrawioImage(inputPath)) {
            // Keep the `.drawio` suffix so Draw.io reads the extracted file as XML.
            conversionInputPath = (await reserveTemporaryPath('.drawio')) as DrawioPath;
            await execFileInWorkspace(
                appConfig.execPathDrawio,
                ['-x', '-f', 'xml', '-o', conversionInputPath, inputPath],
                workspaceFolder,
            );
        }

        // `-x` and `-f` must stay separate for Draw.io Desktop 30.3.14 compatibility,
        // and `--crop` prevents a single diagram from spilling onto multiple A4 pages.
        await execFileInWorkspace(
            appConfig.execPathDrawio,
            [conversionInputPath, '-o', temporaryPdfPath, '-x', '-f', 'pdf', '-t', '-a', '--crop'],
            workspaceFolder,
        );
        await cropPdf(appConfig, temporaryPdfPath, temporaryPdfPath, workspaceFolder);
        const drawioTabs = await getDrawioTabs(conversionInputPath);
        return await splitPdf(
            temporaryPdfPath,
            outputTemplatePath,
            workspaceFolder,
            drawioTabs,
            logicalPdfPath,
        );
    } finally {
        await Promise.allSettled(temporaryPaths.map((temporaryPath) => unlink(temporaryPath)));
    }
}

/**
 * Converts every page in a Draw.io file into one PDF without splitting it by tab.
 */
export async function convertDrawioToPdfDirectly(
    appConfig: AppConfig,
    inputPath: DrawioPath,
    outputTemplatePath: PdfTemplatePath,
    workspaceFolder: vscode.WorkspaceFolder,
): Promise<PdfPath> {
    const outputBasePath = getDrawioOutputBasePath(inputPath);
    const outputPath = generatePathFromTemplate(
        outputTemplatePath,
        `${outputBasePath}.pdf` as PdfPath,
        workspaceFolder,
    );

    await createFolder(outputPath);
    await execFileInWorkspace(
        appConfig.execPathDrawio,
        [inputPath, '-o', outputPath, '-x', '-f', 'pdf', '-t', '-a', '--crop'],
        workspaceFolder,
    );

    return outputPath;
}
