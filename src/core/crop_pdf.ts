import * as path from 'node:path';

import type * as vscode from 'vscode';

import type { AppConfig } from '../configuration';
import type { PdfPath, PdfTemplatePath } from '../type';
import { createFolder } from '../utils/create_folder';
import { execFileInWorkspace } from '../utils/exec_file_in_workspace';
import { generatePathFromTemplate } from '../utils/generate_path_from_template';

function pdfcropArgs(gsPath: string, inputPath: PdfPath, outputPath: PdfPath): string[] {
    const explicitGs =
        path.isAbsolute(gsPath) ||
        gsPath.includes('/') ||
        (process.platform === 'win32' && gsPath.includes('\\'));
    return explicitGs ? ['--gscmd', gsPath, inputPath, outputPath] : [inputPath, outputPath];
}

export async function cropPdf(
    appConfig: AppConfig,
    inputPath: PdfPath,
    outputTemplatePath: PdfTemplatePath | PdfPath,
    workspaceFolder: vscode.WorkspaceFolder,
): Promise<PdfPath> {
    const outputPath = generatePathFromTemplate(
        outputTemplatePath,
        inputPath,
        workspaceFolder,
    ) as PdfPath;
    await createFolder(outputPath);
    await execFileInWorkspace(
        appConfig.execPathPdfcrop,
        pdfcropArgs(appConfig.execPathGs, inputPath, outputPath),
        workspaceFolder,
    );
    return outputPath;
}
