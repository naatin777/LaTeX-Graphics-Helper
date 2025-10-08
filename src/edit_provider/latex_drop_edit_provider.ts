import * as path from 'path';

import * as vscode from 'vscode';

import { AppConfig, getAppConfig } from '../configuration';
import { localeMap } from '../locale_map';
import { convertToLatexPath } from '../utils';
import { escapeLatex } from '../utils/escape';
import { LatexSnippet } from '../utils/latex_snippet';

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
        const latexSnippet = new LatexSnippet(appConfig);

        latexSnippet.wrapEnvironment('figure', () => {
            latexSnippet
                .appendFigurePlacement()
                .lineBreak();
            latexSnippet
                .appendCommand('centering', undefined, undefined)
                .lineBreak();
            latexSnippet
                .appendCommand('includegraphics', () => {
                    latexSnippet.appendGraphicsOptions();
                }, () => {
                    latexSnippet.appendText(convertToLatexPath(relativeFilePath));
                })
                .lineBreak();
            latexSnippet
                .appendCommand('caption', undefined, () => {
                    latexSnippet.appendPlaceholder(escapeLatex(fileName));
                })
                .appendCommand('label', undefined, () => {
                    latexSnippet
                        .appendText('fig:')
                        .appendPlaceholder(escapeLatex(fileName));
                })
                .lineEnd();
        });

        return latexSnippet.snippet;
    }

    createMultiplePdfSnippet(
        appConfig: AppConfig,
        fileNames: string[],
        relativeFilePaths: string[]
    ): vscode.SnippetString {
        const latexSnippet = new LatexSnippet(appConfig);

        latexSnippet.wrapEnvironment('figure', () => {
            latexSnippet
                .appendFigurePlacement()
                .lineBreak();
            latexSnippet
                .appendFigureAlignment()
                .lineBreak();

            for (let i = 0; i < relativeFilePaths.length; i++) {
                latexSnippet.wrapEnvironment('minipage', () => {
                    latexSnippet
                        .appendSubfigureVerticalAlignment()
                        .appendSubfigureWidth()
                        .lineBreak();
                    latexSnippet
                        .appendFigureAlignment()
                        .lineBreak();
                    latexSnippet
                        .appendCommand('includegraphics', () => {
                            latexSnippet.appendGraphicsOptions();
                        }, () => {
                            latexSnippet.appendText(convertToLatexPath(relativeFilePaths[i]));
                        })
                        .lineBreak();
                    latexSnippet
                        .appendCommand('caption', undefined, () => {
                            latexSnippet.appendPlaceholder(escapeLatex(fileNames[i]));
                        })
                        .appendCommand('label', undefined, () => {
                            latexSnippet
                                .appendText('fig:')
                                .appendPlaceholder(escapeLatex(fileNames[i]));
                        })
                        .lineEnd();
                });
                if (i < relativeFilePaths.length - 1) {
                    latexSnippet.lineBreak();
                    latexSnippet.appendSubfigureSpacing().lineEnd();
                } else {
                    latexSnippet.lineEnd();
                }
            }
        });

        return latexSnippet.snippet;
    }
}
