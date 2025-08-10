import * as fs from 'fs';
import * as path from 'path';

import * as vscode from 'vscode';

import { getChoiceFigureAlignment, getChoiceFigurePlacement, getChoiceGraphicsOptions, getGeminiRequests, getOutputPathClipboardImage } from '../configuration';
import { convertImageToPdf } from '../context_menu/convert_image_to_pdf';
import { askGemini } from '../gemini/ask_gemini';
import { localeMap } from '../locale_map';
import { createFolder, escapeLatex, escapeLatexLabel, replaceOutputPath, toPosixPath } from '../utils';

type FileInfo = {
    buffer: Buffer<ArrayBuffer>;
    ext: string;
    mime: string;
}

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
        token: vscode.CancellationToken
    ): Promise<vscode.DocumentPasteEdit[] | undefined> {
        const info = await this.getDataTransferInformation(dataTransfer);

        if (!info) {
            return;
        }

        const uri = document.uri;
        const fileDirname = path.dirname(uri.fsPath);
        const outputPath = getOutputPathClipboardImage();
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri)!;

        const items = this.createQuickPickItems();
        const pickedItem = await vscode.window.showQuickPick(items);

        let snippet: vscode.SnippetString | undefined;

        try {
            if (pickedItem) {
                if (pickedItem.label === localeMap('pasteDefaultImageFormatLabel')) {
                    const replacedOutputPath = replaceOutputPath(uri.fsPath, outputPath, workspaceFolder);
                    createFolder(replacedOutputPath);
                    snippet = await this.handleDefaultImagePaste(replacedOutputPath, info, fileDirname);
                } else if (pickedItem.label === localeMap('pastePdfFormatLabel')) {
                    const replacedOutputPath = replaceOutputPath(uri.fsPath, outputPath, workspaceFolder);
                    createFolder(replacedOutputPath);
                    snippet = await this.handlePdfPaste(replacedOutputPath, info, fileDirname, workspaceFolder);
                } else if (pickedItem.label === localeMap('customRequestLabel')) {
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

    private async getFileBufferFromDataTransferItem(dataTransferItem: vscode.DataTransferItem) {
        const file = dataTransferItem.asFile();
        const data = await file?.data();
        return data ? Buffer.from(data) : undefined;
    }

    private async getDataTransferInformation(dataTransfer: vscode.DataTransfer) {
        const mimeTypes = [
            { mime: 'application/pdf', ext: '.pdf' },
            { mime: 'image/png', ext: '.png' },
            { mime: 'image/jpeg', ext: '.jpeg' },
            { mime: 'image/svg+xml', ext: '.svg' }
        ];

        for (const { mime, ext } of mimeTypes) {
            const item = dataTransfer.get(mime);
            if (item) {
                const buffer = await this.getFileBufferFromDataTransferItem(item);
                if (buffer) {
                    return { buffer, ext, mime };
                }
            }
        }
        return undefined;
    }

    private async handleDefaultImagePaste(imagePath: string, info: FileInfo, fileDirname: string): Promise<vscode.SnippetString | undefined> {
        const imagePathWithExt = `${imagePath}${info.ext}`;
        fs.writeFileSync(imagePathWithExt, info.buffer);
        const relativeFilePath = path.relative(fileDirname, imagePathWithExt);
        return this.createSinglePdfSnippet('', relativeFilePath);
    }

    private async handlePdfPaste(imagePath: string, info: FileInfo, fileDirname: string, workspaceFolder: vscode.WorkspaceFolder): Promise<vscode.SnippetString | undefined> {
        const imagePathWithExt = `${imagePath}${info.ext}`;
        fs.writeFileSync(imagePathWithExt, info.buffer);
        if (info.mime !== 'application/pdf') {
            convertImageToPdf(imagePathWithExt, imagePath, workspaceFolder);
            if (fs.existsSync(imagePathWithExt)) {
                fs.unlinkSync(imagePathWithExt);
            }
        }
        const relativeFilePath = path.relative(fileDirname, `${imagePath}.pdf`);
        return this.createSinglePdfSnippet('', relativeFilePath);
    }

    private async handleCustomGeminiRequest(info: FileInfo): Promise<vscode.SnippetString | undefined> {
        const customRequest = await vscode.window.showInputBox({ prompt: 'Enter your custom request for Gemini' });
        if (customRequest) {
            const geminiResponse = await askGemini(this.secretStorage, customRequest, info.buffer, info.mime);
            return new vscode.SnippetString(geminiResponse);
        }
        return undefined;
    }

    private async handleGeminiRequest(label: string, info: FileInfo): Promise<vscode.SnippetString | undefined> {
        const geminiResponse = await askGemini(this.secretStorage, label, info.buffer, info.mime);
        return new vscode.SnippetString(geminiResponse);
    }

    createSinglePdfSnippet(fileName: string = '', relativeFilePath: string): vscode.SnippetString {
        const snippet = new vscode.SnippetString();

        const choiceFigurePlacement = getChoiceFigurePlacement();
        const choiceFigureAlignment = getChoiceFigureAlignment();
        const choiceGraphicsOptions = getChoiceGraphicsOptions();

        snippet.appendText('\\begin{figure}');
        if (choiceFigurePlacement.length >= 2) {
            snippet.appendChoice(getChoiceFigurePlacement(), 1);
        } else {
            snippet.appendText(choiceFigurePlacement[0] ?? '');
        }
        snippet.appendText('\n');

        snippet.appendText('\t');
        if (choiceFigureAlignment.length >= 2) {
            snippet.appendChoice(choiceFigureAlignment, 2);
        } else {
            snippet.appendText(choiceFigureAlignment[0] ?? '');
        }
        snippet.appendText('\n');

        snippet.appendText('\t\\includegraphics');
        if (choiceGraphicsOptions.length >= 2) {
            snippet.appendChoice(getChoiceGraphicsOptions(), 3);
        } else {
            snippet.appendText(choiceGraphicsOptions[0] ?? '');
        }
        snippet.appendText(`{${toPosixPath(relativeFilePath)}}`);
        snippet.appendText('\n');

        snippet.appendText('\t\\caption{');
        snippet.appendPlaceholder(escapeLatex(fileName), 4);
        snippet.appendText('}');
        snippet.appendText(`\\label{fig:${escapeLatexLabel(fileName)}}`);
        snippet.appendText('\n');

        snippet.appendText('\\end{figure}');

        return snippet;
    }

    private createQuickPickItems(): vscode.QuickPickItem[] {
        const geminiRequests = getGeminiRequests().map((value) => ({ label: value }));
        return [
            { label: localeMap('pastePdfFormatLabel') },
            { label: localeMap('pasteDefaultImageFormatLabel') },
            { label: '', kind: vscode.QuickPickItemKind.Separator },
            ...geminiRequests,
            { label: '', kind: vscode.QuickPickItemKind.Separator },
            { label: localeMap('customRequestLabel') },
        ];
    }
}
