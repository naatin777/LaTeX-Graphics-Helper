import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { convertImageToPdf } from '../context_menu/convert_image_to_pdf';
import { createFolder, escapeLatex, escapeLatexLabel, replaceOutputPath, toPosixPath } from '../utils';
import { getChoiceFigureAlignment, getChoiceFigurePlacement, getChoiceGraphicsOptions, getGeminiRequests, getOutputPathClipboardImage } from '../configuration';
import { askGemini } from '../gemini/ask_gemini';

type FileInfo = {
    buffer: Buffer<ArrayBuffer>;
    ext: string;
    mime: string;
}

export class LatexPasteEditProvider implements vscode.DocumentPasteEditProvider {
    private static readonly CUSTOM_REQUEST_LABEL = 'Write a custom request';
    private static readonly PASTE_DEFAULT_IMAGE_FORMAT_LABEL = 'Paste as default image format';
    private static readonly PASTE_PDF_FORMAT_LABEL = 'Paste as PDF format';

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

        const replacedOutputPath = replaceOutputPath(uri.fsPath, outputPath, workspaceFolder);
        createFolder(replacedOutputPath);

        const items = this.createQuickPickItems();
        const pickedItem = await vscode.window.showQuickPick(items);

        let snippet: vscode.SnippetString | undefined;

        if (pickedItem) {
            if (pickedItem.label === LatexPasteEditProvider.PASTE_DEFAULT_IMAGE_FORMAT_LABEL) {
                snippet = await this.handleDefaultImagePaste(replacedOutputPath, info, fileDirname);
            } else if (pickedItem.label === LatexPasteEditProvider.PASTE_PDF_FORMAT_LABEL) {
                snippet = await this.handlePdfPaste(replacedOutputPath, info, info.mime !== 'application/pdf', replacedOutputPath, fileDirname, workspaceFolder);
            } else if (pickedItem.label === LatexPasteEditProvider.CUSTOM_REQUEST_LABEL) {
                snippet = await this.handleCustomGeminiRequest(info);
            } else {
                snippet = await this.handleGeminiRequest(pickedItem.label, info, info.mime);
            }
        }

        if (snippet) {
            const edit = new vscode.DocumentPasteEdit(snippet, '', vscode.DocumentDropOrPasteEditKind.Empty);
            return [edit];
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
        fs.writeFileSync(`${imagePath}${info}`, info.buffer);
        const relativeFilePath = path.relative(fileDirname, imagePath);
        return this.createSinglePdfSnippet('', relativeFilePath);
    }

    private async handlePdfPaste(imagePath: string, info: FileInfo, isImage: boolean, replacedOutputPath: string, fileDirname: string, workspaceFolder: vscode.WorkspaceFolder): Promise<vscode.SnippetString | undefined> {
        fs.writeFileSync(imagePath, info.buffer);
        if (isImage) {
            convertImageToPdf(imagePath, `${replacedOutputPath}.pdf`, workspaceFolder);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
            imagePath = `${replacedOutputPath}.pdf`;
        }
        const relativeFilePath = path.relative(fileDirname, imagePath);
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

    private async handleGeminiRequest(label: string, info: FileInfo, fileMimeType: string): Promise<vscode.SnippetString | undefined> {
        const geminiResponse = await askGemini(this.secretStorage, label, info.buffer, fileMimeType);
        return new vscode.SnippetString(geminiResponse);
    }

    createSinglePdfSnippet(fileName: string = '', relativeFilePath: string): vscode.SnippetString {
        const snippet = new vscode.SnippetString();

        snippet.appendText('\\begin{figure}');
        snippet.appendChoice(getChoiceFigurePlacement(), 1);
        snippet.appendText('\n');
        snippet.appendText('\t');
        snippet.appendChoice(getChoiceFigureAlignment(), 1);
        snippet.appendText('\n');
        snippet.appendText('\t\\includegraphics');
        snippet.appendChoice(getChoiceGraphicsOptions(), 1);
        snippet.appendText(`{${toPosixPath(relativeFilePath)}}\n`);
        snippet.appendText('\t\\caption{');
        snippet.appendPlaceholder(escapeLatex(fileName), 2);
        snippet.appendText('}');
        snippet.appendText(`\\label{fig:${escapeLatexLabel(fileName)}}\n`);
        snippet.appendText('\\end{figure}');

        return snippet;
    }

    private createQuickPickItems(): vscode.QuickPickItem[] {
        const geminiRequests = getGeminiRequests().map((value) => ({ label: value }));
        return [
            { label: LatexPasteEditProvider.PASTE_PDF_FORMAT_LABEL },
            { label: LatexPasteEditProvider.PASTE_DEFAULT_IMAGE_FORMAT_LABEL },
            { label: '', kind: vscode.QuickPickItemKind.Separator },
            ...geminiRequests,
            { label: '', kind: vscode.QuickPickItemKind.Separator },
            { label: LatexPasteEditProvider.CUSTOM_REQUEST_LABEL },
        ];
    }
}
