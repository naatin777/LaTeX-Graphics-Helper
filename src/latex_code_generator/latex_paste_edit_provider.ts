import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import * as vscode from 'vscode';

import { getChoiceFigureAlignment, getChoiceFigurePlacement, getChoiceGraphicsOptions, getExecPathInkscape, getGeminiRequests, getOutputPathClipboardImage } from '../configuration';
import { CLIPBOARD_IMAGE_TYPES } from '../constants';
import { askGemini } from '../gemini/ask_gemini';
import { localeMap } from '../locale_map';
import { FileInfo } from '../type';
import { createFolder, escapeLatex, escapeLatexLabel, replaceOutputPath, toPosixPath } from '../utils';

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
            ...getGeminiRequests().map(request => ({ label: request, detail: '' })),
        ]);

        const uri = document.uri;
        const fileDirname = path.dirname(uri.fsPath);
        const outputPath = getOutputPathClipboardImage();
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);

        if (!workspaceFolder) {
            return;
        }

        let snippet: vscode.SnippetString | undefined;

        try {
            if (pickedItem) {
                if (pickedItem.detail === localeMap('pasteAsImageDetail')) {
                    const replacedOutputPath = replaceOutputPath(uri.fsPath, outputPath, workspaceFolder);
                    createFolder(replacedOutputPath);
                    snippet = await this.handleDefaultImagePaste(replacedOutputPath, info, fileDirname);
                } else if (pickedItem.detail === localeMap('pasteAsPdfDetail')) {
                    const replacedOutputPath = replaceOutputPath(uri.fsPath, outputPath, workspaceFolder);
                    createFolder(replacedOutputPath);
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
        const relativeFilePath = path.relative(fileDirname, imagePathWithExt);
        return this.createSinglePdfSnippet('', relativeFilePath);
    }

    private async handlePdfPaste(imagePath: string, info: FileInfo, fileDirname: string, workspaceFolder: vscode.WorkspaceFolder): Promise<vscode.SnippetString | undefined> {
        const imagePathWithExt = `${imagePath}.${info.type.ext}`;
        const pdfPath = `${imagePath}.pdf`;
        fs.writeFileSync(imagePathWithExt, info.buffer);
        if (info.type.mime !== 'application/pdf') {
            execFileSync(getExecPathInkscape(), [imagePathWithExt, '-o', pdfPath, '--export-type=pdf', '--export-area-drawing'], { cwd: workspaceFolder.uri.fsPath });

            if (fs.existsSync(imagePathWithExt)) {
                fs.unlinkSync(imagePathWithExt);
            }
        }
        const relativeFilePath = path.relative(fileDirname, pdfPath);
        return this.createSinglePdfSnippet('', relativeFilePath);
    }

    private async handleCustomGeminiRequest(info: FileInfo): Promise<vscode.SnippetString | undefined> {
        const customRequest = await vscode.window.showInputBox({ prompt: 'Enter your custom request for Gemini' });
        if (customRequest) {
            const geminiResponse = await askGemini(this.secretStorage, customRequest, info);
            if (geminiResponse) {
                return new vscode.SnippetString(geminiResponse);
            }
        }
        return undefined;
    }

    private async handleGeminiRequest(label: string, info: FileInfo): Promise<vscode.SnippetString | undefined> {
        const geminiResponse = await askGemini(this.secretStorage, label, info);
        if (!geminiResponse) {
            return undefined;
        }
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
}
