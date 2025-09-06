import * as vscode from 'vscode';

import { getExecPathPdftocairo } from '../configuration';
import { ImageOutputPath, PdftocairoOptions } from '../type';
import { createFolder, replaceOutputPath } from '../utils';

import { splitPdf } from './split_pdf';

export function createConvertPdfToImageCommand(
    execPath: string,
    inputPath: string,
    outputPath: string,
    options: string[],
): string {

    return `${execPath} ${options.join(' ')} "${inputPath}" "${outputPath}"`;
}

export async function convertPdfToImage(uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder, outputPath: ImageOutputPath, options: PdftocairoOptions) {
    const outputPaths = await splitPdf(uri.fsPath, outputPath, workspaceFolder, []);

    outputPaths.forEach((path) => {

        const replacedOutputPath = replaceOutputPath(uri.fsPath, outputPath, workspaceFolder);

        createFolder(replacedOutputPath);

        const convertPdfToImageCommand = createConvertPdfToImageCommand(getExecPathPdftocairo(), uri.fsPath, path, options);

    });
}
