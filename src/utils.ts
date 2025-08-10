import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import * as vscode from 'vscode';

import { getShell } from './configuration';

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

export function replaceOutputPath(inputPath: string, outputPath: string, workspaceFolder: vscode.WorkspaceFolder, tab: string = '') {
    return outputPath
        .replace(/\${workspaceFolder}/g, workspaceFolder.uri.fsPath)
        .replace(/\${workspaceFolderBasename}/g, workspaceFolder.name)
        .replace(/\${file}/g, inputPath)
        .replace(/\${relativeFile}/g, path.relative(workspaceFolder.uri.fsPath, inputPath))
        .replace(/\${relativeFileDirname}/g, path.dirname(path.relative(workspaceFolder.uri.fsPath, inputPath)))
        .replace(/\${fileBasename}/g, path.basename(inputPath))
        .replace(/\${fileBasenameNoExtension}/g, path.basename(inputPath, path.extname(inputPath)))
        .replace(/\${fileDirname}/g, path.dirname(inputPath))
        .replace(/\${fileExtname}/g, path.extname(inputPath))
        .replace(/\${tab}/g, tab)
        .replace(/\${dateNow}/g, Date.now().toString());
}

export function createFolder(filePath: string) {
    const folder = path.dirname(filePath);

    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }
}

export function runCommand(command: string, workspaceFolder: vscode.WorkspaceFolder) {
    execSync(
        command,
        {
            'cwd': workspaceFolder.uri.fsPath,
            'shell': getShell()
        }
    );
}
