import * as path from 'path';

import * as vscode from 'vscode';
import { Utils } from 'vscode-uri';

import { JpegPath, JpegTemplatePath, Path, PdfPath, PdfTemplatePath, PngPath, PngTemplatePath, SvgPath, SvgTemplatePath, TemplatePath } from './type';

export function convertToLatexPath(filePath: string): string {
    return path.normalize(filePath).split(/[\\\/]/g).join(path.posix.sep);
}

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
        .replace(/\${dateNow}/g, Date.now().toLocaleString()) as Path;
}

async function directoryExists(uri: vscode.Uri): Promise<boolean> {
    try {
        const stats = await vscode.workspace.fs.stat(uri);
        return stats.type === vscode.FileType.Directory;
    } catch {
        return false;
    }
}

export async function createFolder(file: Path) {
    const uri = vscode.Uri.file(file);
    const folder = Utils.dirname(uri);

    if (!(await directoryExists(folder))) {
        await vscode.workspace.fs.createDirectory(folder);
    }
}

export async function deletePdfExt(file: PdfPath) {
    return file.endsWith('.pdf') ? file.slice(0, -4) : file;
}
