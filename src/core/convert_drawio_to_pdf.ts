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
    const drawioInputPath = `${inputPath}.drawio` as DrawioPath;
    const temporaryPdfPath = `${outputBasePath}.pdf` as PdfPath;

    if (isEditableDrawioImage(inputPath)) {
        await execFileInWorkspace(
            appConfig.execPathDrawio,
            ['-x', '-f', 'xml', '-o', drawioInputPath, inputPath],
            workspaceFolder,
        );
    }

    const conversionInputPath = isEditableDrawioImage(inputPath) ? drawioInputPath : inputPath;

    await execFileInWorkspace(
        appConfig.execPathDrawio,
        [conversionInputPath, '-o', temporaryPdfPath, '-x', '-f', 'pdf', '-t', '-a', '--crop'],
        workspaceFolder,
    );
    await cropPdf(appConfig, temporaryPdfPath, temporaryPdfPath, workspaceFolder);
    const drawioTabs = await getDrawioTabs(conversionInputPath);
    const outputPaths = await splitPdf(
        temporaryPdfPath,
        outputTemplatePath,
        workspaceFolder,
        drawioTabs,
    );
    await vscode.workspace.fs.delete(vscode.Uri.file(temporaryPdfPath), {
        recursive: true,
        useTrash: false,
    });

    if (isEditableDrawioImage(inputPath)) {
        await vscode.workspace.fs.delete(vscode.Uri.file(drawioInputPath), {
            recursive: true,
            useTrash: false,
        });
    }

    return outputPaths;
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
