import * as assert from 'assert';

import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    suiteTeardown(() => {
        vscode.window.showInformationMessage('All tests done!');
    });

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('naatin777.latex-graphics-helper'));
    });

    test('Should activate the extension', async () => {
        await vscode.extensions.getExtension('naatin777.latex-graphics-helper')!.activate();
        assert.ok(true);
    });
});
