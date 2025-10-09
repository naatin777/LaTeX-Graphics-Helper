import * as vscode from 'vscode';

import { AppConfig } from '../configuration';
import { PdfPath, PdfTemplatePath } from '../type';
import { createFolder } from '../utils/create_folder';
import { execFileInWorkspace } from '../utils/exec_file_in_workspace';
import { generatePathFromTemplate } from '../utils/generate_path_from_template';

export async function cropPdf(
    appConfig: AppConfig,
    inputPath: PdfPath,
    outputTemplatePath: PdfTemplatePath | PdfPath,
    workspaceFolder: vscode.WorkspaceFolder
): Promise<PdfPath> {
    const outputPath = generatePathFromTemplate(outputTemplatePath, inputPath, workspaceFolder);
    await createFolder(outputPath);
    await execFileInWorkspace(appConfig.execPathPdfcrop, [inputPath, outputPath], workspaceFolder);
    return outputPath as PdfPath;
}
