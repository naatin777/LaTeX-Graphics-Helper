import * as assert from 'node:assert';

import * as vscode from 'vscode';

import { escapeLatex, escapeLatexLabel } from '../../utils/escape';

suite('エスケープのテストスイート', () => {
    suiteTeardown(() => {
        vscode.window.showInformationMessage('All tests done!');
    });

    test('escapeLatex が LaTeX の特殊文字をエスケープする', () => {
        assert.strictEqual(escapeLatex('123 abc &#$@|'), '123 abc \\&\\#\\$@\\textbar ');
        assert.strictEqual(
            escapeLatex('!<>><?'),
            '!\\textless \\textgreater \\textgreater \\textless ?',
        );
        assert.strictEqual(escapeLatex('%%%}}{{'), '\\%\\%\\%\\}\\}\\{\\{');
        assert.strictEqual(
            escapeLatex('a\\b%c{d}e&f#g$h^i~j_k|l<m>n'),
            'a\\textbackslash b\\%c\\{d\\}e\\&f\\#g\\$h\\textasciicircum i\\textasciitilde j\\_k\\textbar l\\textless m\\textgreater n',
        );
    });

    test('escapeLatexLabel がラベル用に文字を除去する', () => {
        assert.strictEqual(escapeLatexLabel('a\\b%c{d}e&f#g'), 'abcde&fg');
        assert.strictEqual(escapeLatexLabel('_}{{}_\\+##+\\-%%-'), '__++--');
        assert.strictEqual(escapeLatexLabel('a&1b%[2c]&3'), 'a&1b[2c]&3');
        assert.strictEqual(escapeLatexLabel('\\\\\\{{{{{}}}}}##?><!'), '?><!');
    });
});
