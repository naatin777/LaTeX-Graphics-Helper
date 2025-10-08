import * as fs from 'fs';
import * as path from 'path';

import * as vscode from 'vscode';

import { AppConfig, getAppConfig } from '../configuration';
import { CLIPBOARD_IMAGE_TYPES } from '../constants';
import { askGeminiWithImage } from '../core/ask_gemini';
import { localeMap } from '../locale_map';
import { FileInfo, PdfPath, PdfTemplatePath } from '../type';
import { convertToLatexPath, createFolder, generatePathFromTemplate } from '../utils';
import { escapeLatex, escapeLatexLabel } from '../utils/escape';
import { LatexSnippet } from '../utils/latex_snippet';

export class LatexPasteEditProvider implements vscode.DocumentPasteEditProvider {

    secretStorage: vscode.SecretStorage;

    constructor(secretStorage: vscode.SecretStorage) {
        this.secretStorage = secretStorage;
    }

    async provideDocumentPasteEdits(
        document: vscode.TextDocument,
        ranges: readonly vscode.Range[],
        dataTransfer: vscode.DataTransfer,
        context: vscode.DocumentPasteEditContext,
        token: vscode.CancellationToken,
        appConfig: AppConfig = getAppConfig()
    ): Promise<vscode.DocumentPasteEdit[] | undefined> {
        token.onCancellationRequested(() => {
            vscode.window.showWarningMessage(localeMap('cancelled'));
        });

        const info = await this.getDataTransferInformation(dataTransfer);

        if (!info) {
            return;
        }

        const pickedItem = await vscode.window.showQuickPick([
            { label: localeMap('pasteAsPdfLabel'), detail: localeMap('pasteAsPdfDetail') },
            { label: localeMap('pasteAsImageLabel'), detail: localeMap('pasteAsImageDetail') },
            { label: localeMap('aiRequestLabel'), detail: localeMap('aiRequestDetail') },
            { label: localeMap('registered'), detail: '', kind: vscode.QuickPickItemKind.Separator },
            ...getAppConfig().geminiRequests.map(request => ({ label: request, detail: '' })),
        ]);

        const uri = document.uri;
        const fileDirname = path.dirname(uri.fsPath);
        const outputPath = getAppConfig().outputPathClipboardImage as PdfTemplatePath;
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);

        if (!workspaceFolder) {
            return;
        }

        let snippet: vscode.SnippetString | undefined;

        try {
            if (pickedItem) {
                if (pickedItem.detail === localeMap('pasteAsImageDetail')) {
                    const replacedOutputPath = generatePathFromTemplate(outputPath, uri.fsPath as PdfPath, workspaceFolder);
                    await createFolder(replacedOutputPath);
                    snippet = await this.handleDefaultImagePaste(replacedOutputPath, info, fileDirname);
                } else if (pickedItem.detail === localeMap('pasteAsPdfDetail')) {
                    const replacedOutputPath = generatePathFromTemplate(outputPath, uri.fsPath as PdfPath, workspaceFolder);
                    await createFolder(replacedOutputPath);
                    snippet = await this.handlePdfPaste(replacedOutputPath, info, fileDirname, workspaceFolder);
                } else if (pickedItem.detail === localeMap('aiRequestDetail')) {
                    snippet = await this.handleCustomGeminiRequest(info);
                } else {
                    snippet = await this.handleGeminiRequest(pickedItem.label, info);
                }
            }

            if (snippet) {
                const edit = new vscode.DocumentPasteEdit(snippet, '', vscode.DocumentDropOrPasteEditKind.Empty);
                return [edit];
            }

        } catch (e) {
            if (e instanceof Error) {
                vscode.window.showErrorMessage(e.message.toString());
            }
        }

        return undefined;
    }

    private async getDataTransferInformation(dataTransfer: vscode.DataTransfer) {
        for (const type of CLIPBOARD_IMAGE_TYPES) {
            const item = dataTransfer.get(type.mime);
            if (item) {
                const file = item.asFile();
                const data = await file?.data();
                if (data) {
                    return { type, buffer: Buffer.from(data) };
                }
            }
        }
        return undefined;
    }

    private async handleDefaultImagePaste(imagePath: string, info: FileInfo, fileDirname: string): Promise<vscode.SnippetString | undefined> {
        const imagePathWithExt = `${imagePath}.${info.type.ext}`;
        fs.writeFileSync(imagePathWithExt, info.buffer);
        const relativeFilePath = path.relative(fileDirname, imagePathWithExt) as PdfPath;
        return this.createSinglePdfSnippet(getAppConfig(), '', relativeFilePath);
    }

    private async handlePdfPaste(imagePath: string, info: FileInfo, fileDirname: string, workspaceFolder: vscode.WorkspaceFolder): Promise<vscode.SnippetString | undefined> {
        const imagePathWithExt = `${imagePath}.${info.type.ext}`;
        const pdfPath = `${imagePath}.pdf`;
        fs.writeFileSync(imagePathWithExt, info.buffer);
        // TODO: Implement image to PDF conversion
        const relativeFilePath = path.relative(fileDirname, pdfPath);
        return this.createSinglePdfSnippet(getAppConfig(), '', relativeFilePath);
    }

    private async handleCustomGeminiRequest(info: FileInfo): Promise<vscode.SnippetString | undefined> {
        const customRequest = await vscode.window.showInputBox({ prompt: 'Enter your custom request for Gemini' });
        if (customRequest) {
            const geminiResponse = await askGeminiWithImage(getAppConfig(), this.secretStorage, customRequest, info);
            if (geminiResponse) {
                return new vscode.SnippetString(geminiResponse);
            }
        }
        return undefined;
    }

    private async handleGeminiRequest(label: string, info: FileInfo): Promise<vscode.SnippetString | undefined> {
        const geminiResponse = await askGeminiWithImage(getAppConfig(), this.secretStorage, label, info);
        if (!geminiResponse) {
            return undefined;
        }
        return new vscode.SnippetString(geminiResponse);
    }

    createSinglePdfSnippet(appConfig: AppConfig, fileName: string, relativeFilePath: string): vscode.SnippetString {
        const latexSnippet = new LatexSnippet(appConfig);

        latexSnippet.wrapEnvironment('figure', () => {
            latexSnippet.appendFigurePlacement().lineBreak();
            latexSnippet.appendFigureAlignment().lineBreak();
            latexSnippet.appendCommand('includegraphics', () => {
                latexSnippet.appendGraphicsOptions();
            }, () => {
                latexSnippet.appendText(convertToLatexPath(relativeFilePath));
            }).lineBreak();
            latexSnippet.appendCommand('caption', () => { }, () => {
                latexSnippet.appendPlaceholder(escapeLatex(fileName));
            }).appendCommand('label', () => { }, () => {
                latexSnippet.appendText('fig:').appendPlaceholder(escapeLatexLabel(fileName));
            }).lineBreak();
        });

        return latexSnippet.snippet;
    }
}
