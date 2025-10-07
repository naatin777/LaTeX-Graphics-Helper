import * as path from 'path';

import * as vscode from 'vscode';
import { Utils } from 'vscode-uri';

import { JpegPath, JpegTemplatePath, Path, PdfPath, PdfTemplatePath, PngPath, PngTemplatePath, SvgPath, SvgTemplatePath, TemplatePath } from './type';

export function toPosixPath(filePath: string): string {
    return path.normalize(filePath).split(/[\\\/]/g).join(path.posix.sep);
}

export function escapeLatex(text: string): string {
    return text
        .replace(/\\/g, '\\textbackslash ')
        .replace(/%/g, '\\%')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}')
        .replace(/&/g, '\\&')
        .replace(/#/g, '\\#')
        .replace(/\$/g, '\\$')
        .replace(/\^/g, '\\textasciicircum ')
        .replace(/~/g, '\\textasciitilde ')
        .replace(/_/g, '\\_')
        .replace(/\|/g, '\\textbar ')
        .replace(/</g, '\\textless ')
        .replace(/>/g, '\\textgreater ');
}

export function escapeLatexLabel(text: string): string {
    return text
        .replace(/\\/g, '')
        .replace(/%/g, '')
        .replace(/{/g, '')
        .replace(/}/g, '')
        .replace(/#/g, '');
}

export function transpose<T>(a: T[][]): T[][] {
    return a[0].map((_, c) => a.map(r => r[c]));
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
