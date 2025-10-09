import * as path from 'path';

import * as vscode from 'vscode';

import { AppConfig, getAppConfig } from '../configuration';
import { CLIPBOARD_IMAGE_TYPES } from '../constants';
import { askGeminiWithImage } from '../core/ask_gemini';
import { convertBitmapToPdf } from '../core/convert_bitmap_to_pdf';
import { localeMap } from '../locale_map';
import { BitmapPath, FileData, Path, PdfPath, PdfTemplatePath } from '../type';
import { convertToLatexPath, generatePathFromTemplate } from '../utils';
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

        const data = await this.getDataTransferData(dataTransfer);
        if (!data) {
            return;
        }

        const pickedItem = await vscode.window.showQuickPick([
            { label: localeMap('pasteAsPdfLabel'), detail: localeMap('pasteAsPdfDetail'), description: `(${localeMap('builtIn')})` },
            { label: localeMap('pasteAsImageLabel'), detail: localeMap('pasteAsImageDetail'), description: `(${localeMap('builtIn')})` },
            { label: localeMap('aiRequestLabel'), detail: localeMap('aiRequestDetail'), description: `(${localeMap('builtIn')})` },
            { label: '', detail: '', description: '', kind: vscode.QuickPickItemKind.Separator },
            ...appConfig.geminiRequests.map(request => ({ label: request.label, detail: request.prompt, description: `(${localeMap('custom')})` })),
        ]);
        if (!pickedItem) {
            return;
        }

        const uri = document.uri;
        const fileDirname = path.dirname(uri.fsPath);
        const outputTemplatePath = appConfig.outputPathClipboardImage;
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);

        if (!workspaceFolder) {
            return;
        }

        const outputPath = generatePathFromTemplate(outputTemplatePath, uri.fsPath as PdfPath, workspaceFolder);

        try {
            if (pickedItem.description === `(${localeMap('builtIn')})`) {
                if (pickedItem.label === localeMap('pasteAsPdfLabel')) {
                    const snippet = await this.handlePdfPaste(appConfig, outputPath, data, fileDirname, workspaceFolder);
                    if (snippet) {
                        const edit = new vscode.DocumentPasteEdit(snippet, localeMap('pasteAsPdfLabel'), vscode.DocumentDropOrPasteEditKind.Empty);
                        return [edit];
                    }
                } else if (pickedItem.detail === localeMap('pasteAsImageDetail')) {
                    const snippet = await this.handleImagePaste(appConfig, outputPath, data, fileDirname);
                    if (snippet) {
                        const edit = new vscode.DocumentPasteEdit(snippet, localeMap('pasteAsImageLabel'), vscode.DocumentDropOrPasteEditKind.Empty);
                        return [edit];
                    }
                } else if (pickedItem.detail === localeMap('aiRequestDetail')) {
                    const snippet = await this.handleCustomGeminiRequest(appConfig, data);
                    if (snippet) {
                        const edit = new vscode.DocumentPasteEdit(snippet, localeMap('aiRequestLabel'), vscode.DocumentDropOrPasteEditKind.Empty);
                        return [edit];
                    }
                }
            } else {
                const snippet = await this.handleGeminiRequest(appConfig, pickedItem, data);
                if (snippet) {
                    const edit = new vscode.DocumentPasteEdit(snippet, pickedItem.label, vscode.DocumentDropOrPasteEditKind.Empty);
                    return [edit];
                }
            }
        } catch (e) {
            if (e instanceof Error) {
                vscode.window.showErrorMessage(e.message.toString());
            }
        }

        return undefined;
    }

    private async getDataTransferData(dataTransfer: vscode.DataTransfer): Promise<FileData | undefined> {
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

    private async handleImagePaste(appConfig: AppConfig, outputPath: Path, data: FileData, targetDirname: string): Promise<vscode.SnippetString | undefined> {
        const outputPathWithExt = `${outputPath}.${data.type.ext}`;
        await vscode.workspace.fs.writeFile(vscode.Uri.file(outputPathWithExt), data.buffer);
        const relativeFilePath = path.relative(targetDirname, outputPathWithExt) as PdfPath;
        return this.createSingleFileSnippet(appConfig, path.basename(relativeFilePath, `.${data.type.ext}`), relativeFilePath);
    }

    private async handlePdfPaste(appConfig: AppConfig, outputPath: Path, data: FileData, targetDirname: string, workspaceFolder: vscode.WorkspaceFolder): Promise<vscode.SnippetString | undefined> {
        if (data.type.ext === 'png' || data.type.ext === 'jpeg') {
            const outputPathWithExt = `${outputPath}.${data.type.ext}`;
            await vscode.workspace.fs.writeFile(vscode.Uri.file(outputPathWithExt), data.buffer);
            const pdfPath = await convertBitmapToPdf(outputPathWithExt as BitmapPath, `${outputPath}.pdf` as PdfTemplatePath, workspaceFolder, data.type.ext);
            const relativeFilePath = path.relative(targetDirname, pdfPath);
            await vscode.workspace.fs.delete(vscode.Uri.file(outputPathWithExt), { recursive: true, useTrash: false });
            return this.createSingleFileSnippet(appConfig, path.basename(relativeFilePath, '.pdf'), relativeFilePath);
        } else {
            throw new Error(localeMap('unsupportedFileType'));
        }
    }

    private async handleCustomGeminiRequest(appConfig: AppConfig, data: FileData): Promise<vscode.SnippetString | undefined> {
        const customRequest = await vscode.window.showInputBox({ prompt: localeMap('enterCustomGeminiRequest') });
        if (customRequest) {
            const geminiResponse = await askGeminiWithImage(appConfig, this.secretStorage, customRequest, data);
            if (geminiResponse) {
                return new vscode.SnippetString(geminiResponse);
            }
        }
        return undefined;
    }

    private async handleGeminiRequest(appConfig: AppConfig, pickedItem: vscode.QuickPickItem, data: FileData): Promise<vscode.SnippetString | undefined> {
        const geminiResponse = await askGeminiWithImage(appConfig, this.secretStorage, pickedItem.detail ?? '', data);
        if (!geminiResponse) {
            return undefined;
        }
        return new vscode.SnippetString(geminiResponse);
    }

    createSingleFileSnippet(appConfig: AppConfig, fileName: string, relativeFilePath: string): vscode.SnippetString {
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
            }).lineEnd();
        });

        return latexSnippet.snippet;
    }
}
