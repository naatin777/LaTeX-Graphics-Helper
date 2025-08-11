import * as assert from 'assert';

import * as vscode from 'vscode';

suite('Extension Test Suite', () => {

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('Naatin.latex-graphics-helper'));
    });

    test('Should activate the extension', async () => {
        await vscode.extensions.getExtension('Naatin.latex-graphics-helper')!.activate();
        assert.ok(true);
    });
});
