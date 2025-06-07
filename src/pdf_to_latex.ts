import * as path from 'path';
import * as vscode from 'vscode';
import { escapeLatex, escapeLatexLabel, toPosixPath } from './utils';
import { getGraphicsOptionsDefault, getPlacementSpecifiersChoice, getPlacementSpecifiersDefault, getPlacementSpecifiersUseDefault } from './configuration';

export class PdfToLatexDropEditProvider implements vscode.DocumentDropEditProvider {
    async provideDocumentDropEdits(
        document: vscode.TextDocument,
        position: vscode.Position,
        dataTransfer: vscode.DataTransfer,
        token: vscode.CancellationToken
    ): Promise<vscode.DocumentDropEdit | undefined> {
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

                if (extName === '.pdf') {
                    const singlePdfSnippet = this.createSinglePdfSnippet(fileName, relativeFilePath);
                    return new vscode.DocumentDropEdit(singlePdfSnippet);
                } else {
                    return undefined;
                }
            } else if (uris.length > 1) {
                return undefined;
            } else {
                return undefined;
            }
        }
    }

    createSinglePdfSnippet(fileName: string, relativeFilePath: string): vscode.SnippetString {
        const snippet = new vscode.SnippetString();
        let number = 0;

        snippet.appendText('\\begin{figure}');
        if (getPlacementSpecifiersUseDefault()) {
            snippet.appendText(getPlacementSpecifiersDefault());
        } else {
            snippet.appendChoice(getPlacementSpecifiersChoice(), ++number);
        }
        snippet.appendText('\n');
        snippet.appendText('\t\\centering\n');
        snippet.appendText(`\t\\includegraphics${getGraphicsOptionsDefault()}{${toPosixPath(relativeFilePath)}}\n`);
        snippet.appendText('\t\\caption{');
        snippet.appendPlaceholder(escapeLatex(fileName), ++number);
        snippet.appendText('}');
        snippet.appendText(`\\label{fig:${escapeLatexLabel(fileName)}}\n`);
        snippet.appendText('\\end{figure}');

        return snippet;
    }
}
