import * as assert from 'assert';

import * as vscode from 'vscode';

import { LatexDropEditProvider } from '../../edit_provider/latex_drop_edit_provider';

import { createPdf, createTestDirectory, deleteDirectory } from './helpers';

suite('LaTeX drop edit provider e2e Test Suite', () => {
    suiteSetup(async () => {
        await vscode.extensions.getExtension('naatin777.latex-graphics-helper')!.activate();

        const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
        await configuration.update('figure.placementOptions', ['[H]'], vscode.ConfigurationTarget.Workspace);
        await configuration.update('figure.alignmentOptions', ['\\centering'], vscode.ConfigurationTarget.Workspace);
        await configuration.update('figure.graphicsOptions', ['[width=0.8\\linewidth]'], vscode.ConfigurationTarget.Workspace);
        await configuration.update('subfigure.verticalAlignmentOptions', ['[t]'], vscode.ConfigurationTarget.Workspace);
        await configuration.update('subfigure.widthOptions', ['{0.45\\linewidth}'], vscode.ConfigurationTarget.Workspace);
        await configuration.update('subfigure.spacingOptions', ['\\hfill'], vscode.ConfigurationTarget.Workspace);
    });

    test('should create a figure snippet for a dropped PDF URI', async () => {
        const directory = await createTestDirectory('drop-single-pdf');

        try {
            const documentUri = vscode.Uri.joinPath(directory, 'main.tex');
            const pdfUri = vscode.Uri.joinPath(directory, 'figures', 'sample.pdf');

            await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(directory, 'figures'));
            await vscode.workspace.fs.writeFile(documentUri, Buffer.from('', 'utf8'));
            await createPdf(pdfUri, 1);

            const document = await vscode.workspace.openTextDocument(documentUri);
            const edit = await provideDropEdit(document, [pdfUri]);
            const snippet = getSnippetValue(edit);

            assert.ok(snippet.includes('\\\\begin{figure\\}'));
            assert.ok(snippet.includes('\\\\includegraphics[width=0.8\\\\linewidth]{figures/sample.pdf\\}'));
            assert.ok(snippet.includes('\\\\caption{${1:sample}\\}'));
            assert.ok(snippet.includes('\\\\label{fig:${2:sample}\\}'));
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should create minipage snippets for multiple dropped PDF URIs', async () => {
        const directory = await createTestDirectory('drop-multiple-pdfs');

        try {
            const documentUri = vscode.Uri.joinPath(directory, 'main.tex');
            const firstPdfUri = vscode.Uri.joinPath(directory, 'figures', 'first.pdf');
            const secondPdfUri = vscode.Uri.joinPath(directory, 'figures', 'second.pdf');

            await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(directory, 'figures'));
            await vscode.workspace.fs.writeFile(documentUri, Buffer.from('', 'utf8'));
            await createPdf(firstPdfUri, 1);
            await createPdf(secondPdfUri, 1);

            const document = await vscode.workspace.openTextDocument(documentUri);
            const edit = await provideDropEdit(document, [firstPdfUri, secondPdfUri]);
            const snippet = getSnippetValue(edit);

            assert.strictEqual(countOccurrences(snippet, '\\\\begin{minipage\\}'), 2);
            assert.ok(snippet.includes('\\\\includegraphics[width=0.8\\\\linewidth]{figures/first.pdf\\}'));
            assert.ok(snippet.includes('\\\\includegraphics[width=0.8\\\\linewidth]{figures/second.pdf\\}'));
            assert.ok(snippet.includes('\\\\hfill'));
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should not provide an edit when dropped data does not contain URI list text', async () => {
        const directory = await createTestDirectory('drop-without-uri-list');

        try {
            const documentUri = vscode.Uri.joinPath(directory, 'main.tex');
            await vscode.workspace.fs.writeFile(documentUri, Buffer.from('', 'utf8'));

            const document = await vscode.workspace.openTextDocument(documentUri);
            const provider = new LatexDropEditProvider();
            const dataTransfer = new vscode.DataTransfer();
            dataTransfer.set('text/plain', new vscode.DataTransferItem('plain text'));

            const tokenSource = new vscode.CancellationTokenSource();
            try {
                const edit = await provider.provideDocumentDropEdits(
                    document,
                    new vscode.Position(0, 0),
                    dataTransfer,
                    tokenSource.token
                );

                assert.strictEqual(edit, undefined);
            } finally {
                tokenSource.dispose();
            }
        } finally {
            await deleteDirectory(directory);
        }
    });
});

async function provideDropEdit(document: vscode.TextDocument, uris: vscode.Uri[]): Promise<vscode.DocumentDropEdit> {
    const provider = new LatexDropEditProvider();
    const dataTransfer = new vscode.DataTransfer();
    dataTransfer.set('text/uri-list', new vscode.DataTransferItem(uris.map(uri => uri.toString()).join('\r\n')));

    const tokenSource = new vscode.CancellationTokenSource();
    try {
        const edit = await provider.provideDocumentDropEdits(
            document,
            new vscode.Position(0, 0),
            dataTransfer,
            tokenSource.token
        );

        assert.ok(edit, 'Expected a document drop edit');
        assert.ok(!Array.isArray(edit), 'Expected a single document drop edit');
        return edit;
    } finally {
        tokenSource.dispose();
    }
}

function getSnippetValue(edit: vscode.DocumentDropEdit): string {
    assert.ok(edit.insertText instanceof vscode.SnippetString, 'Expected drop edit to insert a snippet');
    return edit.insertText.value;
}

function countOccurrences(value: string, search: string): number {
    return value.split(search).length - 1;
}
