import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { imageToPdf } from '../context_menu/convert_image_to_pdf';
import { escapeLatex, escapeLatexLabel, toPosixPath } from '../utils';
import { getChoiceFigureAlignment, getChoiceFigurePlacement, getChoiceGraphicsOptions, getGeminiRequests, getOutputPathClipboardImage } from '../configuration';
import { askGemini } from '../gemini/ask_gemini';

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
        const applicationPdfEntry = dataTransfer.get('application/pdf');
        const imagePngEntry = dataTransfer.get('image/png');
        const imageJpegEntry = dataTransfer.get('image/jpeg');
        const imageSvgEntry = dataTransfer.get('image/svg+xml');

        const entry = applicationPdfEntry || imagePngEntry || imageJpegEntry || imageSvgEntry;

        if (!entry) {
            return undefined;
        }

        const file = await entry.asFile();
        if (!file) {
            return undefined;
        }

        const fileContent = await file.data();

        const fileExtension = applicationPdfEntry ? '.pdf'
            : imagePngEntry ? '.png'
                : imageJpegEntry ? '.jpeg'
                    : imageSvgEntry ? '.svg'
                        : '';

        const fileMimeType = applicationPdfEntry ? 'application/pdf'
            : imagePngEntry ? 'image/png'
                : imageJpegEntry ? 'image/jpeg'
                    : imageSvgEntry ? 'image/svg+xml'
                        : '';

        const uri = document.uri;
        const extname = path.extname(uri.fsPath);
        const fileName = path.basename(uri.fsPath, extname);
        const folderName = path.dirname(uri.fsPath);
        const outputPath = getOutputPathClipboardImage();
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath ?? '';

        const replacedOutputPath = outputPath
            .replace(/\${fileName}/g, fileName)
            .replace(/\${folderName}/g, folderName)
            .replace(/\${workspaceFolder}/g, workspaceFolder)
            .replace(/\${dateNow}/g, Date.now().toString());
        const replacedOutputFolderPath = path.dirname(replacedOutputPath);

        if (!fs.existsSync(replacedOutputFolderPath)) {
            fs.mkdirSync(replacedOutputFolderPath, { recursive: true });
        }

        const imagePath = `${replacedOutputPath}${fileExtension}`;

        const buffer = Buffer.from(fileContent);

        try {
            const geminiRequests = getGeminiRequests().map((value) => ({ label: value }));
            const items: vscode.QuickPickItem[] = [
                { label: LatexPasteEditProvider.PASTE_PDF_FORMAT_LABEL },
                { label: LatexPasteEditProvider.PASTE_DEFAULT_IMAGE_FORMAT_LABEL },
                { label: '', kind: vscode.QuickPickItemKind.Separator },
                ...geminiRequests,
                { label: '', kind: vscode.QuickPickItemKind.Separator },
                { label: LatexPasteEditProvider.CUSTOM_REQUEST_LABEL },
            ];

            const pickedItem = await vscode.window.showQuickPick(items);

            let snippet: vscode.SnippetString | undefined;

            if (pickedItem) {
                if (pickedItem.label === LatexPasteEditProvider.PASTE_DEFAULT_IMAGE_FORMAT_LABEL) {
                    snippet = await this.handleDefaultImagePaste(imagePath, buffer, folderName);
                } else if (pickedItem.label === LatexPasteEditProvider.PASTE_PDF_FORMAT_LABEL) {
                    snippet = await this.handlePdfPaste(imagePath, buffer, (imagePngEntry || imageJpegEntry || imageSvgEntry) !== undefined, replacedOutputPath, folderName);
                } else if (pickedItem.label === LatexPasteEditProvider.CUSTOM_REQUEST_LABEL) {
                    snippet = await this.handleCustomGeminiRequest(buffer, fileMimeType);
                } else {
                    snippet = await this.handleGeminiRequest(pickedItem.label, buffer, fileMimeType);
                }
            }

            if (snippet) {
                const edit = new vscode.DocumentPasteEdit(snippet, '', vscode.DocumentDropOrPasteEditKind.Empty);
                return [edit];
            }

            return undefined;

        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Failed to save clipboard image: ${error.message}`);
            }
            return undefined;
        }
    }

    private async handleDefaultImagePaste(imagePath: string, buffer: Buffer<ArrayBuffer>, folderName: string): Promise<vscode.SnippetString | undefined> {
        fs.writeFileSync(imagePath, buffer);
        const relativeFilePath = path.relative(folderName, imagePath);
        return this.createSinglePdfSnippet('', relativeFilePath);
    }

    private async handlePdfPaste(imagePath: string, buffer: Buffer<ArrayBuffer>, isImage: boolean, replacedOutputPath: string, folderName: string): Promise<vscode.SnippetString | undefined> {
        fs.writeFileSync(imagePath, buffer);
        if (isImage) {
            imageToPdf(imagePath, `${replacedOutputPath}.pdf`);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
            imagePath = `${replacedOutputPath}.pdf`;
        }
        const relativeFilePath = path.relative(folderName, imagePath);
        return this.createSinglePdfSnippet('', relativeFilePath);
    }

    private async handleCustomGeminiRequest(buffer: Buffer<ArrayBuffer>, fileMimeType: string): Promise<vscode.SnippetString | undefined> {
        const customRequest = await vscode.window.showInputBox({ prompt: 'Enter your custom request for Gemini' });
        if (customRequest) {
            const geminiResponse = await askGemini(this.secretStorage, customRequest, buffer, fileMimeType);
            return new vscode.SnippetString(geminiResponse);
        }
        return undefined;
    }

    private async handleGeminiRequest(label: string, buffer: Buffer<ArrayBuffer>, fileMimeType: string): Promise<vscode.SnippetString | undefined> {
        const geminiResponse = await askGemini(this.secretStorage, label, buffer, fileMimeType);
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
}
