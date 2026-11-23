import { mkdtemp, rm } from 'node:fs/promises';
import * as path from 'node:path';

import * as vscode from 'vscode';

import type { AppConfig } from '../configuration';
import { splitPdf } from '../core/split_pdf';
import type {
    JpegPath,
    JpegTemplatePath,
    PdfPath,
    PdfTemplatePath,
    PngPath,
    PngTemplatePath,
    SvgPath,
    SvgTemplatePath,
} from '../type';
import { createFolder } from '../utils/create_folder';
import { execFileInWorkspace } from '../utils/exec_file_in_workspace';
import { generatePathFromTemplate } from '../utils/generate_path_from_template';

async function convertPdfToImage(
    appConfig: AppConfig,
    inputPath: PdfPath,
    outputTemplatePath: PngTemplatePath | JpegTemplatePath | SvgTemplatePath,
    workspaceFolder: vscode.WorkspaceFolder,
    format: 'png' | 'jpeg' | 'svg',
): Promise<string[]> {
    const firstOutputPath = generatePathFromTemplate(
        (outputTemplatePath + '.pdf') as PdfTemplatePath,
        inputPath,
        workspaceFolder,
        '1',
    ).slice(0, -4) as PngPath | JpegPath | SvgPath;
    await createFolder(firstOutputPath);
    const temporaryDirectory = await mkdtemp(
        path.join(path.dirname(firstOutputPath), '.lgh-image-'),
    );
    try {
        const temporaryPdfPaths = await splitPdf(
            inputPath,
            path.join(temporaryDirectory, '${page}.pdf') as PdfTemplatePath,
            workspaceFolder,
        );
        const outputPaths = temporaryPdfPaths.map((_, index) =>
            index === 0
                ? firstOutputPath
                : generatePathFromTemplate(
                      (outputTemplatePath + '.pdf') as PdfTemplatePath,
                      inputPath,
                      workspaceFolder,
                      (index + 1).toString(),
                  ).slice(0, -4),
        );
        const conversions = temporaryPdfPaths.map(async (pdfPath, index) => {
            const basePath = pdfPath.slice(0, -4);
            const outputPath = outputPaths[index];
            const args =
                format === 'png'
                    ? ['-png', '-transp', '-singlefile']
                    : format === 'jpeg'
                      ? ['-jpeg', '-singlefile']
                      : ['-svg'];
            await execFileInWorkspace(
                appConfig.execPathPdftocairo,
                [pdfPath, basePath, ...args],
                workspaceFolder,
                { allowStderr: true },
            );
            await createFolder(outputPath as PngPath | JpegPath | SvgPath);
            const generatedPath =
                basePath + (format === 'png' ? '.png' : format === 'jpeg' ? '.jpg' : '');
            await vscode.workspace.fs.rename(
                vscode.Uri.file(generatedPath),
                vscode.Uri.file(outputPath),
                { overwrite: true },
            );
            return outputPath;
        });
        const results = await Promise.allSettled(conversions);
        const failure = results.find((result) => result.status === 'rejected');
        if (failure?.status === 'rejected') {
            throw failure.reason;
        }
        return outputPaths;
    } finally {
        await rm(temporaryDirectory, { recursive: true, force: true });
    }
}

export async function convertPdfToPng(
    appConfig: AppConfig,
    inputPath: PdfPath,
    outputTemplatePath: PngTemplatePath,
    workspaceFolder: vscode.WorkspaceFolder,
): Promise<PngPath[]> {
    return (await convertPdfToImage(
        appConfig,
        inputPath,
        outputTemplatePath,
        workspaceFolder,
        'png',
    )) as PngPath[];
}

export async function convertPdfToJpeg(
    appConfig: AppConfig,
    inputPath: PdfPath,
    outputTemplatePath: JpegTemplatePath,
    workspaceFolder: vscode.WorkspaceFolder,
): Promise<JpegPath[]> {
    return (await convertPdfToImage(
        appConfig,
        inputPath,
        outputTemplatePath,
        workspaceFolder,
        'jpeg',
    )) as JpegPath[];
}

export async function convertPdfToSvg(
    appConfig: AppConfig,
    inputPath: PdfPath,
    outputTemplatePath: SvgTemplatePath,
    workspaceFolder: vscode.WorkspaceFolder,
): Promise<SvgPath[]> {
    return (await convertPdfToImage(
        appConfig,
        inputPath,
        outputTemplatePath,
        workspaceFolder,
        'svg',
    )) as SvgPath[];
}
