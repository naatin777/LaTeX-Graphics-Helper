import * as vscode from 'vscode';

import { AppConfig } from '../configuration';
import { PdfPath, PdfTemplatePath } from '../type';
import { createFolder, generatePathFromTemplate } from '../utils';
import { execFileInWorkspace } from '../utils/exec_file_in_workspace';

export async function cropPdf(
    appConfig: AppConfig,
    inputPath: PdfPath,
    outputTemplatePath: PdfTemplatePath | PdfPath,
    workspaceFolder: vscode.WorkspaceFolder
): Promise<PdfPath> {
    const outputPath = generatePathFromTemplate(outputTemplatePath, inputPath, workspaceFolder);
    console.log('あいうえお');
    await createFolder(outputPath);
    console.log('あいうえお１');
    await execFileInWorkspace(appConfig.execPathPdfcrop, [inputPath, outputPath], workspaceFolder);
    console.log('あいうえお２');
    return outputPath as PdfPath;
}
