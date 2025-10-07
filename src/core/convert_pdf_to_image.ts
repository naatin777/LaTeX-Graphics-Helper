import * as vscode from 'vscode';

import { AppConfig } from '../configuration';
import { splitPdf } from '../core/split_pdf';
import { JpegTemplatePath, PdfPath, PdfTemplatePath, PngTemplatePath, SvgTemplatePath } from '../type';
import { execFileInWorkspace } from '../utils/exec_file_in_workspace';

export async function convertPdfToImage(
    appConfig: AppConfig,
    inputPath: PdfPath,
    outputTemplatePath: PngTemplatePath | JpegTemplatePath | SvgTemplatePath,
    workspaceFolder: vscode.WorkspaceFolder,
) {
    const outputPaths = await splitPdf(inputPath, (outputTemplatePath + '.pdf') as PdfTemplatePath, workspaceFolder, []);
    outputPaths.forEach((path: string) => {
        console.log(outputTemplatePath.__brand);
        if (outputTemplatePath.__brand === 'PngTemplatePath') {
            execFileInWorkspace(appConfig.execPathPdftocairo, [path, path.slice(0, -4), '-png', '-transp', '-singlefile'], workspaceFolder);
            vscode.workspace.fs.rename(vscode.Uri.file(path.slice(0, -4) + '.png'), vscode.Uri.file(path.slice(0, -4).slice(0, -4)));
        } else if (outputTemplatePath.__brand === 'JpegTemplatePath') {
            execFileInWorkspace(appConfig.execPathPdftocairo, [path, path.slice(0, -4), '-jpeg', '-singlefile'], workspaceFolder);
            vscode.workspace.fs.rename(vscode.Uri.file(path.slice(0, -4) + '.jpeg'), vscode.Uri.file(path.slice(0, -4).slice(0, -4)));
        } else if (outputTemplatePath.__brand === 'SvgTemplatePath') {
            execFileInWorkspace(appConfig.execPathPdftocairo, [path, path.slice(0, -4), '-svg'], workspaceFolder);
        }
        vscode.workspace.fs.delete(vscode.Uri.file(path), { recursive: true, useTrash: false });
    });
}
