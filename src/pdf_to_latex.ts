import * as path from 'path';
import * as vscode from 'vscode';
import { escapeLatex, escapeLatexLabel, toPosixPath, transpose } from './utils';
import { getGraphicsOptionsDefault, getMinipageOptionsChoice, getMinipageOptionsDefault, getMinipageOptionsUseDefault, getPlacementSpecifiersChoice, getPlacementSpecifiersDefault, getPlacementSpecifiersUseDefault } from './configuration';

export class PdfToLatexDropEditProvider implements vscode.DocumentDropEditProvider {
    async provideDocumentDropEdits(
        document: vscode.TextDocument,
        position: vscode.Position,
        dataTransfer: vscode.DataTransfer,
        token: vscode.CancellationToken
    ): Promise<vscode.DocumentDropEdit[] | vscode.DocumentDropEdit | undefined> {
        const dataTransferItem = dataTransfer.get('text/uri-list');
        if (!dataTransferItem) {
            return undefined;
        } else {
            const uris = (await dataTransferItem.asString())
                .split('\r\n')
                .map(value => vscode.Uri.parse(value));

            const documentDir = path.dirname(document.uri.fsPath);
            if (uris.length === 1) {
                const uri = uris[0];
                const extName = path.extname(uri.fsPath);
                const fileName = path.basename(uri.fsPath, extName);
                const relativeFilePath = path.relative(documentDir, uri.fsPath);

                const singlePdfSnippet = this.createSinglePdfSnippet(fileName, relativeFilePath);
                return new vscode.DocumentDropEdit(singlePdfSnippet, 'Insert LaTeX text');
            } else if (uris.length > 1) {
                const [fileNames, relativeFilePaths] = transpose(
                    uris
                        .map(uri => [
                            path.basename(uri.fsPath, path.extname(uri.fsPath)),
                            path.relative(documentDir, uri.fsPath)
                        ])
                );

                const multiplePdfSnippet = this.createMultiplePdfSnippet(fileNames, relativeFilePaths);
                return new vscode.DocumentDropEdit(multiplePdfSnippet, 'Insert LaTeX text');
            } else {
                return undefined;
            }
        }
    }

    createSinglePdfSnippet(fileName: string, relativeFilePath: string): vscode.SnippetString {
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

    createMultiplePdfSnippet(fileNames: string[], relativeFilePaths: string[]): vscode.SnippetString {
        const snippet = new vscode.SnippetString();

        snippet.appendText('\\begin{figure}');
        if (getPlacementSpecifiersUseDefault()) {
            snippet.appendText(getPlacementSpecifiersDefault());
        } else {
            snippet.appendChoice(getPlacementSpecifiersChoice(), 1);
        }
        snippet.appendText('\n');
        snippet.appendText('\t\\centering\n');
        for (let i = 0; i < relativeFilePaths.length; i++) {
            snippet.appendText('\t\\begin{minipage}');
            if (getMinipageOptionsUseDefault()) {
                snippet.appendText(getMinipageOptionsDefault());
            } else {
                snippet.appendChoice(getMinipageOptionsChoice(), i + 2);
            }
            snippet.appendText(`{${Math.round(0.9 / relativeFilePaths.length * 100.0) / 100.0}\\linewidth}\n`);
            snippet.appendText('\t\t\\centering\n');
            snippet.appendText(`\t\t\\includegraphics${getGraphicsOptionsDefault()}{${toPosixPath(relativeFilePaths[i])}}\n`);
            snippet.appendText('\t\t\\caption{');
            snippet.appendPlaceholder(escapeLatex(fileNames[i]), i + relativeFilePaths.length + 2);
            snippet.appendText('}');
            snippet.appendText(`\\label{fig:${escapeLatexLabel(fileNames[i])}}\n`);
            snippet.appendText('\t\\end{minipage}\n');
            if (relativeFilePaths.length !== i + 1) {
                snippet.appendText('\t\\hspace{0.01\\linewidth}\n');
            }
        }
        snippet.appendText('\\end{figure}');

        return snippet;
    }
}
