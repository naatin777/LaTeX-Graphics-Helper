import * as vscode from 'vscode';

import { AppConfig } from '../configuration'; // 追加
import { ImageOutputPath, PdftocairoOptions } from '../type';
import { createFolder, replaceOutputPath, runCommand } from '../utils';

import { splitPdf } from './split_pdf';

export function createConvertPdfToImageCommand(
    execPath: string,
    inputPath: string,
    outputPath: string,
    options: string[],
): string {
    return `${execPath} "${inputPath}" "${outputPath}" ${options.join(' ')}`;
}

export async function convertPdfToImage(uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder, outputPath: ImageOutputPath, options: PdftocairoOptions, config: AppConfig) { // 追加
    const outputPaths = await splitPdf(uri.fsPath, outputPath, workspaceFolder, []);

    outputPaths.forEach((path: string) => {
        const replacedOutputPath = replaceOutputPath(uri.fsPath, path, workspaceFolder);
        createFolder(replacedOutputPath);

        const convertPdfToImageCommand = createConvertPdfToImageCommand(config.execPathPdftocairo, uri.fsPath, replacedOutputPath, options); // 変更
        runCommand(convertPdfToImageCommand, workspaceFolder);
    });
}
