import * as path from 'path';

import * as vscode from 'vscode';

import { getAppConfig } from '../configuration';
import { toPosixPath, transpose } from '../utils';
import { escapeLatex, escapeLatexLabel } from '../utils/escape';

export class LatexDropEditProvider implements vscode.DocumentDropEditProvider {
    async provideDocumentDropEdits(
        document: vscode.TextDocument,
        position: vscode.Position,
        dataTransfer: vscode.DataTransfer,
        token: vscode.CancellationToken
    ): Promise<vscode.DocumentDropEdit[] | vscode.DocumentDropEdit | undefined> {
        console.log('aaaaaaaaaaaaaaaaaaaaaaaa');
        const dataTransferItem = dataTransfer.get('text/uri-list');
        if (!dataTransferItem) {
            return undefined;
        }
        console.log(await dataTransferItem.asString());

        const uris = (await dataTransferItem.asString())
            .split('\r\n')
            .map(value => vscode.Uri.parse(value));

        const documentDirname = path.dirname(document.uri.fsPath);

        if (uris.length === 1) {
            const uri = uris[0];
            const fileName = path.basename(uri.fsPath, path.extname(uri.fsPath));
            const relativeFilePath = path.relative(documentDirname, uri.fsPath);

            const singlePdfSnippet = this.createSinglePdfSnippet(fileName, relativeFilePath);
            return new vscode.DocumentDropEdit(singlePdfSnippet, 'Insert LaTeX text');
        } else if (uris.length > 1) {
            const [fileNames, relativeFilePaths] = transpose(
                uris
                    .map(uri => [
                        path.basename(uri.fsPath, path.extname(uri.fsPath)),
                        path.relative(documentDirname, uri.fsPath)
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

        const choiceFigurePlacement = getAppConfig().choiceFigurePlacement;
        const choiceFigureAlignment = getAppConfig().choiceFigureAlignment;
        const choiceGraphicsOptions = getAppConfig().choiceGraphicsOptions;

        snippet.appendText('\\begin{figure}');
        if (choiceFigurePlacement.length >= 2) {
            snippet.appendChoice(choiceFigurePlacement, 1);
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
            snippet.appendChoice(choiceGraphicsOptions, 3);
        } else {
            snippet.appendText(choiceGraphicsOptions[0] ?? '');
        }
        snippet.appendText(`{${toPosixPath(relativeFilePath)}}`);
        snippet.appendText('\n');

        snippet.appendText('\t\\caption{');
        snippet.appendPlaceholder(escapeLatex(fileName), 4);
        snippet.appendText(`}\\label{fig:${escapeLatexLabel(fileName)}}`);
        snippet.appendText('\n');

        snippet.appendText('\\end{figure}');

        return snippet;
    }

    createMultiplePdfSnippet(fileNames: string[], relativeFilePaths: string[]): vscode.SnippetString {
        const snippet = new vscode.SnippetString();

        const choiceFigurePlacement = getAppConfig().choiceFigurePlacement;
        const choiceFigureAlignment = getAppConfig().choiceFigureAlignment;
        const choiceGraphicsOptions = getAppConfig().choiceGraphicsOptions;
        const choiceSubVerticalAlignment = getAppConfig().choiceSubVerticalAlignment;
        const choiceSubWidth = getAppConfig().choiceSubWidth;
        const choiceSpaceBetweenSubs = getAppConfig().choiceSpaceBetweenSubs;

        snippet.appendText('\\begin{figure}');
        if (choiceFigurePlacement.length >= 2) {
            snippet.appendChoice(choiceFigurePlacement, 1);
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

        for (let i = 0; i < relativeFilePaths.length; i++) {
            snippet.appendText('\t\\begin{minipage}');
            if (choiceSubVerticalAlignment.length >= 2) {
                snippet.appendChoice(choiceSubVerticalAlignment, i * 6 + 3);
            } else {
                snippet.appendText(choiceSubVerticalAlignment[0] ?? '');
            }
            if (choiceSubWidth.length >= 2) {
                snippet.appendChoice(choiceSubWidth, i * 6 + 4);
            } else {
                snippet.appendText(choiceSubWidth[0] ?? '');
            }
            snippet.appendText('\n');

            snippet.appendText('\t\t');
            if (choiceFigureAlignment.length >= 2) {
                snippet.appendChoice(choiceFigureAlignment, i * 6 + 5);
            } else {
                snippet.appendText(choiceFigureAlignment[0] ?? '');
            }
            snippet.appendText('\n');

            snippet.appendText('\t\t');
            snippet.appendText('\\includegraphics');
            if (choiceGraphicsOptions.length >= 2) {
                snippet.appendChoice(choiceGraphicsOptions, i * 6 + 6);
            } else {
                snippet.appendText(choiceGraphicsOptions[0] ?? '');
            }
            snippet.appendText(`{${toPosixPath(relativeFilePaths[i])}}`);
            snippet.appendText('\n');

            snippet.appendText('\t\t\\caption{');
            snippet.appendPlaceholder(escapeLatex(fileNames[i]), i * 6 + 7);
            snippet.appendText(`}\\label{fig:${escapeLatexLabel(fileNames[i])}}`);
            snippet.appendText('\n');

            snippet.appendText('\t\\end{minipage}');
            snippet.appendText('\n');

            if (relativeFilePaths.length !== i + 1) {
                snippet.appendText('\t');
                if (choiceSpaceBetweenSubs.length >= 2) {
                    snippet.appendChoice(choiceSpaceBetweenSubs, i * 6 + 8);
                } else {
                    snippet.appendText(choiceSpaceBetweenSubs[0] ?? '');
                }
                snippet.appendText('\n');
            }
        }

        snippet.appendText('\\end{figure}');

        return snippet;
    }
}
