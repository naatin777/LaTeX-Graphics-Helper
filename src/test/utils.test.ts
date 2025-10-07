import * as assert from 'assert';

import * as vscode from 'vscode';

import {
    toPosixPath,
    escapeLatex,
    escapeLatexLabel,
    transpose,
} from '../utils';

suite('Utils Test Suite', () => {

    suiteTeardown(() => {
        vscode.window.showInformationMessage('All tests done!');
    });

    test('toPosixPath', () => {
        assert.strictEqual(toPosixPath('C:\\Users\\test\\file.txt'), 'C:/Users/test/file.txt');
        assert.strictEqual(toPosixPath('C:/Users/test/file.txt'), 'C:/Users/test/file.txt');
        assert.strictEqual(toPosixPath('/home/test/file.txt'), '/home/test/file.txt');
        assert.strictEqual(toPosixPath('home/test/file.txt'), 'home/test/file.txt');
        assert.strictEqual(toPosixPath('../home/test/../file.txt'), '../home/file.txt');
    });

    test('escapeLatex', () => {
        assert.strictEqual(escapeLatex('123 abc &#$@|'), '123 abc \\&\\#\\$@\\textbar ');
        assert.strictEqual(escapeLatex('!<>><?'), '!\\textless \\textgreater \\textgreater \\textless ?');
        assert.strictEqual(escapeLatex('%%%}}{{'), '\\%\\%\\%\\}\\}\\{\\{');
        assert.strictEqual(escapeLatex('a\\b%c{d}e&f#g$h^i~j_k|l<m>n'), 'a\\textbackslash b\\%c\\{d\\}e\\&f\\#g\\$h\\textasciicircum i\\textasciitilde j\\_k\\textbar l\\textless m\\textgreater n');
    });

    test('escapeLatexLabel', () => {
        assert.strictEqual(escapeLatexLabel('a\\b%c{d}e&f#g'), 'abcde&fg');
        assert.strictEqual(escapeLatexLabel('_}{{}_\\+##+\\-%%-'), '__++--');
        assert.strictEqual(escapeLatexLabel('a&1b%[2c]&3'), 'a&1b[2c]&3');
        assert.strictEqual(escapeLatexLabel('\\\\\\{{{{{}}}}}##?><!'), '?><!');
    });

    test('transpose', () => {
        assert.deepStrictEqual(transpose([[1, 2, 3], [4, 5, 6]]), [[1, 4], [2, 5], [3, 6]]);
        assert.deepStrictEqual(transpose([[1, 4], [2, 5], [3, 6]]), [[1, 2, 3], [4, 5, 6]]);
        assert.deepStrictEqual(transpose([[1, 2]]), [[1], [2]]);
        assert.deepStrictEqual(transpose([[1], [2]]), [[1, 2]]);
    });

    // test('replaceOutputPath', () => {
    //     const clock = sinon.useFakeTimers(1755592839354);
    //     const inputPath = '/path/to/my/file.pdf';
    //     const workspaceFolder: vscode.WorkspaceFolder = { uri: vscode.Uri.file('/workspace'), name: 'my-workspace', index: 0 };
    //     const tab = 'tab';

    //     assert.strictEqual(replaceOutputPath(inputPath, '${workspaceFolder}/output.pdf', workspaceFolder, tab), path.join('/workspace', 'output.pdf'));
    //     assert.strictEqual(replaceOutputPath(inputPath, '${workspaceFolderBasename}/output.pdf', workspaceFolder, tab), path.join('my-workspace', 'output.pdf'));
    //     assert.strictEqual(replaceOutputPath(inputPath, '${file}.pdf', workspaceFolder, tab), '/path/to/my/file.pdf.pdf');
    //     assert.strictEqual(replaceOutputPath(inputPath, '${relativeFile}.pdf', workspaceFolder, tab), '../path/to/my/file.pdf.pdf');
    //     assert.strictEqual(replaceOutputPath(inputPath, '${relativeFileDirname}/output.pdf', workspaceFolder, tab), path.join('../path/to/my', 'output.pdf'));
    //     assert.strictEqual(replaceOutputPath(inputPath, 'abc/${fileBasename}', workspaceFolder, tab), 'abc/file.pdf');
    //     assert.strictEqual(replaceOutputPath(inputPath, '${fileBasenameNoExtension}.png', workspaceFolder, tab), 'file.png');
    //     assert.strictEqual(replaceOutputPath(inputPath, '${fileDirname}/output.pdf', workspaceFolder, tab), path.join('/path/to/my', 'output.pdf'));
    //     assert.strictEqual(replaceOutputPath(inputPath, 'output${fileExtname}', workspaceFolder, tab), 'output.pdf');
    //     assert.strictEqual(replaceOutputPath(inputPath, 'output-${tab}.pdf', workspaceFolder, tab), 'output-tab.pdf');
    //     assert.strictEqual(replaceOutputPath(inputPath, 'output-${dateNow}.pdf', workspaceFolder, tab), `output-${1755592839354}.pdf`);
    //     assert.strictEqual(replaceOutputPath(inputPath, '${fileDirname}/${fileBasenameNoExtension}-crop.pdf', workspaceFolder, tab), path.join('/path/to/my', 'file-crop.pdf'));
    //     assert.strictEqual(replaceOutputPath(inputPath, inputPath, workspaceFolder, tab), inputPath);
    //     clock.restore();
    // });
});
