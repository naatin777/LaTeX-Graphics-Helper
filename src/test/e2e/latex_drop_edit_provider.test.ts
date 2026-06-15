import * as assert from 'node:assert';

import * as vscode from 'vscode';

import { LatexDropEditProvider } from '../../edit_provider/latex_drop_edit_provider';
import {
    applySnippetAt,
    configurePredictableOutputPaths,
    createPdf,
    createTestDirectory,
    deleteDirectory,
    openLatexDocument,
    readDocumentText,
    uriListDataTransfer,
    workspaceFixturePath,
} from './helpers';

suite('LaTeX drop edit provider e2e Test Suite', () => {
    suiteSetup(async () => {
        await vscode.extensions.getExtension('naatin777.latex-graphics-helper')!.activate();
        await configurePredictableOutputPaths();

        const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
        await configuration.update(
            'figure.placementOptions',
            ['[H]'],
            vscode.ConfigurationTarget.Workspace,
        );
        await configuration.update(
            'figure.alignmentOptions',
            ['\\centering'],
            vscode.ConfigurationTarget.Workspace,
        );
        await configuration.update(
            'figure.graphicsOptions',
            ['[width=0.8\\linewidth]'],
            vscode.ConfigurationTarget.Workspace,
        );
        await configuration.update(
            'subfigure.verticalAlignmentOptions',
            ['[t]'],
            vscode.ConfigurationTarget.Workspace,
        );
        await configuration.update(
            'subfigure.widthOptions',
            ['{0.45\\linewidth}'],
            vscode.ConfigurationTarget.Workspace,
        );
        await configuration.update(
            'subfigure.spacingOptions',
            ['\\hfill'],
            vscode.ConfigurationTarget.Workspace,
        );
    });

    test('should insert three dropped PDF snippets into the LaTeX document', async () => {
        const directory = await createTestDirectory('drop-apply-three-pdfs');

        try {
            const documentUri = vscode.Uri.joinPath(directory, 'main.tex');
            const pdfUris = ['a.pdf', 'b.pdf', 'c.pdf'].map((name) =>
                vscode.Uri.joinPath(directory, 'figs', name),
            );

            await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(directory, 'figs'));
            await vscode.workspace.fs.writeFile(
                documentUri,
                Buffer.from('\\documentclass{article}\n', 'utf8'),
            );
            for (const pdfUri of pdfUris) {
                await createPdf(pdfUri, 1);
            }

            const document = await openLatexDocument(documentUri);
            const edit = await provideDropEdit(document, pdfUris);
            assert.ok(edit.insertText instanceof vscode.SnippetString);
            await applySnippetAt(document, new vscode.Position(1, 0), edit.insertText);

            const text = await readDocumentText(documentUri);
            assert.ok(text.includes('figs/a.pdf'));
            assert.ok(text.includes('figs/b.pdf'));
            assert.ok(text.includes('figs/c.pdf'));
            assert.strictEqual(countOccurrences(text, '\\begin{minipage}'), 3);
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should use relative paths when the LaTeX file is in a subdirectory', async () => {
        const directory = await createTestDirectory('drop-nested-tex');

        try {
            const documentUri = vscode.Uri.joinPath(directory, 'chapters', 'intro.tex');
            const pdfUri = vscode.Uri.joinPath(directory, 'assets', 'diagram.pdf');

            await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(directory, 'chapters'));
            await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(directory, 'assets'));
            await vscode.workspace.fs.writeFile(documentUri, Buffer.from('', 'utf8'));
            await createPdf(pdfUri, 1);

            const document = await openLatexDocument(documentUri);
            const edit = await provideDropEdit(document, [pdfUri]);
            const snippet = getSnippetValue(edit);

            assert.ok(snippet.includes('../assets/diagram.pdf'));
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should accept URI lists with CRLF separators and blank lines', async () => {
        const directory = await createTestDirectory('drop-crlf-uri-list');

        try {
            const documentUri = vscode.Uri.joinPath(directory, 'main.tex');
            const firstPdfUri = vscode.Uri.joinPath(directory, 'one.pdf');
            const secondPdfUri = vscode.Uri.joinPath(directory, 'two.pdf');

            await vscode.workspace.fs.writeFile(documentUri, Buffer.from('', 'utf8'));
            await createPdf(firstPdfUri, 1);
            await createPdf(secondPdfUri, 1);

            const document = await openLatexDocument(documentUri);
            const provider = new LatexDropEditProvider();
            const dataTransfer = new vscode.DataTransfer();
            dataTransfer.set(
                'text/uri-list',
                new vscode.DataTransferItem(
                    `${firstPdfUri.toString()}\r\n\r\n${secondPdfUri.toString()}\r\n`,
                ),
            );

            const tokenSource = new vscode.CancellationTokenSource();
            try {
                const edit = await provider.provideDocumentDropEdits(
                    document,
                    new vscode.Position(0, 0),
                    dataTransfer,
                    tokenSource.token,
                );

                assert.ok(edit && !Array.isArray(edit));
                const snippet = getSnippetValue(edit);
                assert.ok(snippet.includes('one.pdf'));
                assert.ok(snippet.includes('two.pdf'));
            } finally {
                tokenSource.dispose();
            }
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should drop onto the seeded fixture workspace main.tex', async () => {
        const directory = await createTestDirectory('drop-fixture-main');

        try {
            const documentUri = vscode.Uri.file(workspaceFixturePath('main.tex'));
            const pdfUri = vscode.Uri.joinPath(directory, 'fixture-drop.pdf');

            await createPdf(pdfUri, 1);

            const document = await openLatexDocument(documentUri);
            const edit = await provideDropEdit(document, [pdfUri]);
            const snippet = getSnippetValue(edit);

            assert.ok(snippet.includes('fixture-drop.pdf'));
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should label the drop edit for LaTeX insertion', async () => {
        const directory = await createTestDirectory('drop-edit-label');

        try {
            const documentUri = vscode.Uri.joinPath(directory, 'main.tex');
            const pdfUri = vscode.Uri.joinPath(directory, 'x.pdf');

            await vscode.workspace.fs.writeFile(documentUri, Buffer.from('', 'utf8'));
            await createPdf(pdfUri, 1);

            const document = await openLatexDocument(documentUri);
            const provider = new LatexDropEditProvider();
            const tokenSource = new vscode.CancellationTokenSource();
            try {
                const edit = await provider.provideDocumentDropEdits(
                    document,
                    new vscode.Position(0, 0),
                    uriListDataTransfer([pdfUri]),
                    tokenSource.token,
                );

                assert.ok(edit && !Array.isArray(edit));
                assert.ok(typeof edit.title === 'string' && edit.title.length > 0);
            } finally {
                tokenSource.dispose();
            }
        } finally {
            await deleteDirectory(directory);
        }
    });

    test('should insert a dropped PDF snippet into the LaTeX document', async () => {
        const directory = await createTestDirectory('drop-apply-single-pdf');

        try {
            const documentUri = vscode.Uri.joinPath(directory, 'main.tex');
            const pdfUri = vscode.Uri.joinPath(directory, 'figures', 'applied.pdf');

            await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(directory, 'figures'));
            await vscode.workspace.fs.writeFile(
                documentUri,
                Buffer.from('\\documentclass{article}\n', 'utf8'),
            );
            await createPdf(pdfUri, 1);

            const document = await openLatexDocument(documentUri);
            const edit = await provideDropEdit(document, [pdfUri]);
            assert.ok(edit.insertText instanceof vscode.SnippetString);
            await applySnippetAt(document, new vscode.Position(1, 0), edit.insertText);

            const updated = await vscode.workspace.openTextDocument(documentUri);
            assert.ok(updated.getText().includes('figures/applied.pdf'));
            assert.ok(updated.getText().includes('\\begin{figure}'));
        } finally {
            await deleteDirectory(directory);
        }
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
            assert.ok(
                snippet.includes(
                    '\\\\includegraphics[width=0.8\\\\linewidth]{figures/sample.pdf\\}',
                ),
            );
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
            assert.ok(
                snippet.includes(
                    '\\\\includegraphics[width=0.8\\\\linewidth]{figures/first.pdf\\}',
                ),
            );
            assert.ok(
                snippet.includes(
                    '\\\\includegraphics[width=0.8\\\\linewidth]{figures/second.pdf\\}',
                ),
            );
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
                    tokenSource.token,
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

async function provideDropEdit(
    document: vscode.TextDocument,
    uris: vscode.Uri[],
): Promise<vscode.DocumentDropEdit> {
    const provider = new LatexDropEditProvider();
    const dataTransfer = new vscode.DataTransfer();
    dataTransfer.set(
        'text/uri-list',
        new vscode.DataTransferItem(uris.map((uri) => uri.toString()).join('\r\n')),
    );

    const tokenSource = new vscode.CancellationTokenSource();
    try {
        const edit = await provider.provideDocumentDropEdits(
            document,
            new vscode.Position(0, 0),
            dataTransfer,
            tokenSource.token,
        );

        assert.ok(edit, 'Expected a document drop edit');
        assert.ok(!Array.isArray(edit), 'Expected a single document drop edit');
        return edit;
    } finally {
        tokenSource.dispose();
    }
}

function getSnippetValue(edit: vscode.DocumentDropEdit): string {
    assert.ok(
        edit.insertText instanceof vscode.SnippetString,
        'Expected drop edit to insert a snippet',
    );
    return edit.insertText.value;
}

function countOccurrences(value: string, search: string): number {
    return value.split(search).length - 1;
}
