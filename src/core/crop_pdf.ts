import type * as vscode from 'vscode';

import type { AppConfig } from '../configuration';
import type { PdfPath, PdfTemplatePath } from '../type';
import { createFolder } from '../utils/create_folder';
import { execFileInWorkspace } from '../utils/exec_file_in_workspace';
import { generatePathFromTemplate } from '../utils/generate_path_from_template';

export async function cropPdf(
    appConfig: AppConfig,
    inputPath: PdfPath,
    outputTemplatePath: PdfTemplatePath | PdfPath,
    workspaceFolder: vscode.WorkspaceFolder,
): Promise<PdfPath> {
    const outputPath = generatePathFromTemplate(outputTemplatePath, inputPath, workspaceFolder);
    await createFolder(outputPath);
    const gsPath = process.env.LGH_GS;
    const args =
        gsPath && gsPath.length > 0
            ? (['--gscmd', gsPath, inputPath, outputPath] as const)
            : ([inputPath, outputPath] as const);
    await execFileInWorkspace(appConfig.execPathPdfcrop, [...args], workspaceFolder);
    return outputPath as PdfPath;
}
