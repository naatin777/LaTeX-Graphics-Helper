import * as path from 'path';

import * as vscode from 'vscode';

import { AppConfig, getAppConfig } from '../configuration';
import { localeMap } from '../locale_map';
import { toPosixPath } from '../utils';
import { escapeLatex, escapeLatexLabel } from '../utils/escape';

export class LatexDropEditProvider implements vscode.DocumentDropEditProvider {
    async provideDocumentDropEdits(
        document: vscode.TextDocument,
        position: vscode.Position,
        dataTransfer: vscode.DataTransfer,
        token: vscode.CancellationToken,
        appConfig: AppConfig = getAppConfig()
    ): Promise<vscode.DocumentDropEdit[] | vscode.DocumentDropEdit | undefined> {
        const dataTransferItem = dataTransfer.get('text/uri-list');
        if (!dataTransferItem) {
            return undefined;
        }

        const uris = (await dataTransferItem.asString())
            .split(/\r?\n/)
            .filter(value => value)
            .map(value => vscode.Uri.parse(value, true));

        const documentDirname = path.dirname(document.uri.fsPath);
        const { fileNames, relativeFilePaths } = uris.reduce<{ fileNames: string[], relativeFilePaths: string[] }>((acc, uri) => {
            acc.fileNames.push(path.basename(uri.fsPath, path.extname(uri.fsPath)));
            acc.relativeFilePaths.push(path.relative(documentDirname, uri.fsPath));
            return acc;
        }, { fileNames: [], relativeFilePaths: [] });

        if (uris.length === 1) {
            const singlePdfSnippet = this.createSinglePdfSnippet(appConfig, fileNames[0], relativeFilePaths[0]);
            return new vscode.DocumentDropEdit(singlePdfSnippet, localeMap('insertLatex'));
        } else if (uris.length > 1) {
            const multiplePdfSnippet = this.createMultiplePdfSnippet(appConfig, fileNames, relativeFilePaths);
            return new vscode.DocumentDropEdit(multiplePdfSnippet, localeMap('insertLatex'));
        } else {
            return undefined;
        }
    }

    createSinglePdfSnippet(
        appConfig: AppConfig,
        fileName: string,
        relativeFilePath: string
    ): vscode.SnippetString {
        const snippet = new vscode.SnippetString();

        const choiceFigurePlacement = appConfig.choiceFigurePlacement;
        const choiceFigureAlignment = appConfig.choiceFigureAlignment;
        const choiceGraphicsOptions = appConfig.choiceGraphicsOptions;

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

    createMultiplePdfSnippet(
        appConfig: AppConfig,
        fileNames: string[],
        relativeFilePaths: string[]
    ): vscode.SnippetString {
        const snippet = new vscode.SnippetString();

        const choiceFigurePlacement = appConfig.choiceFigurePlacement;
        const choiceFigureAlignment = appConfig.choiceFigureAlignment;
        const choiceGraphicsOptions = appConfig.choiceGraphicsOptions;
        const choiceSubVerticalAlignment = appConfig.choiceSubVerticalAlignment;
        const choiceSubWidth = appConfig.choiceSubWidth;
        const choiceSpaceBetweenSubs = appConfig.choiceSpaceBetweenSubs;

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
