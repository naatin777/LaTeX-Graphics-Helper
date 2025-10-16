import * as path from 'path';

import * as vscode from 'vscode';

import { JpegPath, JpegTemplatePath, Path, PdfPath, PdfTemplatePath, PngPath, PngTemplatePath, SvgPath, SvgTemplatePath, TemplatePath } from '../type';

export function generatePathFromTemplate(templatePath: PdfTemplatePath, sourcePath: Path, workspaceFolder: vscode.WorkspaceFolder, page?: string): PdfPath;
export function generatePathFromTemplate(templatePath: PngTemplatePath, sourcePath: Path, workspaceFolder: vscode.WorkspaceFolder, page?: string): PngPath;
export function generatePathFromTemplate(templatePath: JpegTemplatePath, sourcePath: Path, workspaceFolder: vscode.WorkspaceFolder, page?: string): JpegPath;
export function generatePathFromTemplate(templatePath: SvgTemplatePath, sourcePath: Path, workspaceFolder: vscode.WorkspaceFolder, page?: string): SvgPath;
export function generatePathFromTemplate(templatePath: TemplatePath, sourcePath: Path, workspaceFolder: vscode.WorkspaceFolder, page?: string): Path;
export function generatePathFromTemplate(templatePath: TemplatePath, sourcePath: Path, workspaceFolder: vscode.WorkspaceFolder, page: string = ''): Path {
    return templatePath
        .replace(/\${workspaceFolder}/g, workspaceFolder.uri.fsPath)
        .replace(/\${workspaceFolderBasename}/g, workspaceFolder.name)
        .replace(/\${file}/g, sourcePath)
        .replace(/\${relativeFile}/g, path.relative(workspaceFolder.uri.fsPath, sourcePath))
        .replace(/\${relativeFileDirname}/g, path.dirname(path.relative(workspaceFolder.uri.fsPath, sourcePath)))
        .replace(/\${fileBasename}/g, path.basename(sourcePath))
        .replace(/\${fileBasenameNoExtension}/g, path.basename(sourcePath, path.extname(sourcePath)))
        .replace(/\${fileDirname}/g, path.dirname(sourcePath))
        .replace(/\${fileExtname}/g, path.extname(sourcePath))
        .replace(/\${page}/g, page)
        .replace(/\${dateNow}/g, Date.now().toString()) as Path;
}
