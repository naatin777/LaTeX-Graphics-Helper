import type * as vscode from 'vscode';

import type { AppConfig } from '../configuration';
import type { PdfPath, PdfTemplatePath } from '../type';
import { createFolder } from '../utils/create_folder';
import { execFileInWorkspace } from '../utils/exec_file_in_workspace';
import { generatePathFromTemplate } from '../utils/generate_path_from_template';

function toPdfcropPath(filePath: PdfPath): PdfPath {
    return (process.platform === 'win32' ? filePath.replaceAll('\\', '/') : filePath) as PdfPath;
}

export async function cropPdf(
    appConfig: AppConfig,
    inputPath: PdfPath,
    outputTemplatePath: PdfTemplatePath | PdfPath,
    workspaceFolder: vscode.WorkspaceFolder,
): Promise<PdfPath> {
    const outputPath = generatePathFromTemplate(outputTemplatePath, inputPath, workspaceFolder);
    await createFolder(outputPath);
    await execFileInWorkspace(
        appConfig.execPathPdfcrop,
        [toPdfcropPath(inputPath), toPdfcropPath(outputPath as PdfPath)],
        workspaceFolder,
    );
    return outputPath as PdfPath;
}
