import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getAutoConvertToPdfOnSave, getClipboardImageOutputPath, getGraphicsOptionsDefault, getPlacementSpecifiersChoice, getPlacementSpecifiersDefault, getPlacementSpecifiersUseDefault } from './configuration';
import { imageToPdf } from './image_to_pdf';
import { escapeLatex, escapeLatexLabel, toPosixPath } from './utils';

export class ImageToLatexPasteEditProvider implements vscode.DocumentPasteEditProvider {
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

        const uri = document.uri;
        const extname = path.extname(uri.fsPath);
        const fileName = path.basename(uri.fsPath, extname);
        const folderName = path.dirname(uri.fsPath);
        const outputPath = getClipboardImageOutputPath();
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

        let imagePath = `${replacedOutputPath}${fileExtension}`;

        try {
            fs.writeFileSync(imagePath, Buffer.from(fileContent));

            const autoConvertToPdfOnSave = getAutoConvertToPdfOnSave();

            if (autoConvertToPdfOnSave && (imagePngEntry || imageJpegEntry || imageSvgEntry)) {
                imageToPdf(imagePath, `${replacedOutputPath}.pdf`);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
                imagePath = `${replacedOutputPath}.pdf`;
            }

            const relativeFilePath = path.relative(folderName, imagePath);

            const edit = new vscode.DocumentPasteEdit(this.createSinglePdfSnippet('', relativeFilePath), 'graphics', vscode.DocumentDropOrPasteEditKind.Empty);

            return [edit];

        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Failed to save clipboard image: ${error.message}`);
            }
            return undefined;
        }
    }

    createSinglePdfSnippet(fileName: string = '', relativeFilePath: string): vscode.SnippetString {
        const snippet = new vscode.SnippetString();

        snippet.appendText('\\begin{figure}');
        if (getPlacementSpecifiersUseDefault()) {
            snippet.appendText(getPlacementSpecifiersDefault());
        } else {
            snippet.appendChoice(getPlacementSpecifiersChoice(), 1);
        }
        snippet.appendText('\n');
        snippet.appendText('\t\\centering\n');
        snippet.appendText(`\t\\includegraphics${getGraphicsOptionsDefault()}{${toPosixPath(relativeFilePath)}}\n`);
        snippet.appendText('\t\\caption{');
        snippet.appendPlaceholder(escapeLatex(fileName), 2);
        snippet.appendText('}');
        snippet.appendText(`\\label{fig:${escapeLatexLabel(fileName)}}\n`);
        snippet.appendText('\\end{figure}');

        return snippet;
    }
}
