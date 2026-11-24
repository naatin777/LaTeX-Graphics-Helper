import * as assert from 'node:assert';

import * as vscode from 'vscode';

suite('拡張機能テストスイート', () => {
    suiteTeardown(() => {
        vscode.window.showInformationMessage('All tests done!');
    });

    test('拡張機能が存在する', () => {
        assert.ok(vscode.extensions.getExtension('naatin777.latex-graphics-helper'));
    });

    test('拡張機能を有効化できる', async () => {
        await vscode.extensions.getExtension('naatin777.latex-graphics-helper')!.activate();
        assert.ok(true);
    });
});
