import * as path from 'path';
import * as vscode from 'vscode';
import { escapeLatex, escapeLatexLabel, toPosixPath, transpose } from '../utils';
import { getChoiceFigurePlacement, getChoiceFigureAlignment, getChoiceGraphicsOptions, getChoiceSubVerticalAlignment, getChoiceSubWidth, getChoiceSpaceBetweenSubs } from '../configuration';

export class LatexDropEditProvider implements vscode.DocumentDropEditProvider {
    async provideDocumentDropEdits(
        document: vscode.TextDocument,
        position: vscode.Position,
        dataTransfer: vscode.DataTransfer,
        token: vscode.CancellationToken
    ): Promise<vscode.DocumentDropEdit[] | vscode.DocumentDropEdit | undefined> {
        const dataTransferItem = dataTransfer.get('text/uri-list');

        if (!dataTransferItem) {
            return undefined;
        }

        const uris = (await dataTransferItem.asString())
            .split('\r\n')
            .map(value => vscode.Uri.parse(value));

        const documentDir = path.dirname(document.uri.fsPath);

        if (uris.length === 1) {
            const uri = uris[0];
            const fileName = path.basename(uri.fsPath, path.extname(uri.fsPath));
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

    createSinglePdfSnippet(fileName: string, relativeFilePath: string): vscode.SnippetString {
        const snippet = new vscode.SnippetString();

        snippet.appendText('\\begin{figure}');
        snippet.appendChoice(getChoiceFigurePlacement(), 1);
        snippet.appendText('\n');
        snippet.appendChoice(getChoiceFigureAlignment(), 2);
        snippet.appendText('\n');
        snippet.appendChoice(getChoiceGraphicsOptions(), 3);
        snippet.appendText(`{${toPosixPath(relativeFilePath)}}\n`);
        snippet.appendText('\t\\caption{');
        snippet.appendPlaceholder(escapeLatex(fileName), 4);
        snippet.appendText('}');
        snippet.appendText(`\\label{fig:${escapeLatexLabel(fileName)}}\n`);
        snippet.appendText('\\end{figure}');

        return snippet;
    }

    createMultiplePdfSnippet(fileNames: string[], relativeFilePaths: string[]): vscode.SnippetString {
        const snippet = new vscode.SnippetString();

        snippet.appendText('\\begin{figure}');
        snippet.appendChoice(getChoiceFigurePlacement(), 1);
        snippet.appendText('\n');
        snippet.appendChoice(getChoiceFigureAlignment(), 2);
        snippet.appendText('\n');
        for (let i = 0; i < relativeFilePaths.length; i++) {
            snippet.appendText('\t\\begin{minipage}');
            snippet.appendChoice(getChoiceSubVerticalAlignment(), i + 3);
            snippet.appendChoice(getChoiceSubWidth(), i + relativeFilePaths.length + 3);
            snippet.appendText('\n');
            snippet.appendText('\t\t\\centering\n');
            snippet.appendChoice(getChoiceGraphicsOptions(), i + relativeFilePaths.length * 2 + 3);
            snippet.appendText(`{${toPosixPath(relativeFilePaths[i])}}\n`);
            snippet.appendText('\t\t\\caption{');
            snippet.appendPlaceholder(escapeLatex(fileNames[i]), i + relativeFilePaths.length * 3 + 3);
            snippet.appendText('}');
            snippet.appendText(`\\label{fig:${escapeLatexLabel(fileNames[i])}}\n`);
            snippet.appendText('\t\\end{minipage}\n');
            if (relativeFilePaths.length !== i + 1) {
                snippet.appendChoice(getChoiceSpaceBetweenSubs(), i + relativeFilePaths.length * 4 + 3);
                snippet.appendText('\n');
            }
        }
        snippet.appendText('\\end{figure}');

        return snippet;
    }
}
