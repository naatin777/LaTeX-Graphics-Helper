import path from 'node:path';

import * as vscode from 'vscode';

import { localeMap } from '../locale_map.js';

import { readLatexInsertionConfig, type LatexInsertionConfig } from './latex_config.js';
import { escapeLatex, escapeLatexLabel } from './latex_escape.js';
import { LatexSnippet } from './latex_snippet.js';

export class LatexDropEditProvider implements vscode.DocumentDropEditProvider {
  async provideDocumentDropEdits(
    document: vscode.TextDocument,
    _position: vscode.Position,
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken,
    config: LatexInsertionConfig = readLatexInsertionConfig(),
  ): Promise<vscode.DocumentDropEdit | undefined> {
    if (token.isCancellationRequested || document.uri.scheme !== 'file') {
      return undefined;
    }

    const dataTransferItem = dataTransfer.get('text/uri-list');

    if (!dataTransferItem) {
      return undefined;
    }

    let uriList: string;

    try {
      uriList = await dataTransferItem.asString();
    } catch {
      return undefined;
    }

    if (token.isCancellationRequested) {
      return undefined;
    }

    const uris = parsePdfUris(uriList, token);

    if (!uris || uris.length === 0 || token.isCancellationRequested) {
      return undefined;
    }

    const documentDirname = path.dirname(document.uri.fsPath);
    const fileNames = uris.map((uri) => path.basename(uri.fsPath, path.extname(uri.fsPath)));
    const relativeFilePaths = uris.map((uri) => path.relative(documentDirname, uri.fsPath));

    if (relativeFilePaths.some((relativeFilePath) => path.isAbsolute(relativeFilePath))) {
      return undefined;
    }

    if (token.isCancellationRequested) {
      return undefined;
    }

    const snippet =
      uris.length === 1
        ? this.createSinglePdfSnippet(config, fileNames[0] ?? '', relativeFilePaths[0] ?? '')
        : this.createMultiplePdfSnippet(config, fileNames, relativeFilePaths);

    if (token.isCancellationRequested) {
      return undefined;
    }

    return new vscode.DocumentDropEdit(snippet, localeMap('insertLatex'));
  }

  createSinglePdfSnippet(
    config: LatexInsertionConfig,
    fileName: string,
    relativeFilePath: string,
  ): vscode.SnippetString {
    const snippet = new LatexSnippet(config);

    snippet.wrapEnvironment('figure', () => {
      snippet.appendFigurePlacement().lineBreak();
      snippet.appendFigureAlignment().lineBreak();
      snippet
        .appendCommand(
          'includegraphics',
          () => snippet.appendGraphicsOptions(),
          () => snippet.appendText(snippet.convertToLatexPath(relativeFilePath)),
        )
        .lineBreak();
      snippet
        .appendCommand('caption', undefined, () => snippet.appendPlaceholder(escapeLatex(fileName)))
        .appendCommand('label', undefined, () => {
          snippet.appendText('fig:').appendPlaceholder(escapeLatexLabel(fileName));
        })
        .lineEnd();
    });

    return snippet.snippet;
  }

  createMultiplePdfSnippet(
    config: LatexInsertionConfig,
    fileNames: string[],
    relativeFilePaths: string[],
  ): vscode.SnippetString {
    const snippet = new LatexSnippet(config);

    snippet.wrapEnvironment('figure', () => {
      snippet.appendFigurePlacement().lineBreak();
      snippet.appendFigureAlignment().lineBreak();

      relativeFilePaths.forEach((relativeFilePath, index) => {
        snippet.wrapEnvironment('minipage', () => {
          snippet.appendSubfigureVerticalAlignment().appendSubfigureWidth().lineBreak();
          snippet.appendFigureAlignment().lineBreak();
          snippet
            .appendCommand(
              'includegraphics',
              () => snippet.appendGraphicsOptions(),
              () => snippet.appendText(snippet.convertToLatexPath(relativeFilePath)),
            )
            .lineBreak();
          snippet
            .appendCommand('caption', undefined, () => snippet.appendPlaceholder(escapeLatex(fileNames[index] ?? '')))
            .appendCommand('label', undefined, () => {
              snippet.appendText('fig:').appendPlaceholder(escapeLatexLabel(fileNames[index] ?? ''));
            })
            .lineEnd();
        });

        if (index < relativeFilePaths.length - 1) {
          snippet.lineBreak();
          snippet.appendSubfigureSpacing().lineEnd();
        } else {
          snippet.lineEnd();
        }
      });
    });

    return snippet.snippet;
  }
}

function parsePdfUris(uriList: string, token: vscode.CancellationToken): vscode.Uri[] | undefined {
  const uniqueUris = new Map<string, vscode.Uri>();

  for (const rawLine of uriList.split(/\r?\n/)) {
    if (token.isCancellationRequested) {
      return undefined;
    }

    const line = rawLine.trim();

    if (line === '' || line.startsWith('#')) {
      continue;
    }

    let uri: vscode.Uri;

    try {
      uri = vscode.Uri.parse(line, true);
    } catch {
      return undefined;
    }

    if (uri.scheme !== 'file' || path.extname(uri.fsPath).toLowerCase() !== '.pdf') {
      return undefined;
    }

    uniqueUris.set(uri.toString(), uri);
  }

  return [...uniqueUris.values()];
}
