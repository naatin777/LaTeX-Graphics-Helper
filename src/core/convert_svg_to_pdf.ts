import type * as vscode from 'vscode';

import type { AppConfig } from '../configuration';
import type { PdfTemplatePath, SvgPath } from '../type';
import { execFileInWorkspace } from '../utils/exec_file_in_workspace';
import { generatePathFromTemplate } from '../utils/generate_path_from_template';
import { cropPdf } from './crop_pdf';

export async function convertSvgToPdf(
    appConfig: AppConfig,
    inputPath: SvgPath,
    outputTemplatePath: PdfTemplatePath,
    workspaceFolder: vscode.WorkspaceFolder,
) {
    const outputPath = generatePathFromTemplate(outputTemplatePath, inputPath, workspaceFolder);
    await execFileInWorkspace(
        appConfig.execPathRsvgConvert,
        ['-f', 'pdf', inputPath, '-o', outputPath],
        workspaceFolder,
    );
    await cropPdf(appConfig, outputPath, outputPath, workspaceFolder);
    return outputPath;
}
