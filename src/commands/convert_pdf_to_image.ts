import { execFileSync } from 'child_process';

import * as vscode from 'vscode';

import { AppConfig } from '../configuration';
import { ImageOutputPath, PdftocairoOptions } from '../type';
import { createFolder, replaceOutputPath } from '../utils';

import { splitPdf } from './split_pdf';

export async function convertPdfToImage(uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder, outputPath: ImageOutputPath, options: PdftocairoOptions, config: AppConfig) {
    const outputPaths = await splitPdf(uri.fsPath, outputPath, workspaceFolder, []);

    outputPaths.forEach((path: string) => {
        const replacedOutputPath = replaceOutputPath(uri.fsPath, path, workspaceFolder);
        createFolder(replacedOutputPath);

        execFileSync(config.execPathPdftocairo, [uri.fsPath, replacedOutputPath, ...options], { cwd: workspaceFolder.uri.fsPath });
    });
}
