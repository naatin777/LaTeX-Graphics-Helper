import * as assert from 'assert';
import * as path from 'path';

import * as sinon from 'sinon';
import * as vscode from 'vscode';

import { Path, TemplatePath } from '../../type';
import { generatePathFromTemplate } from '../../utils/generate_path_from_template';

suite('generate_path_from_template Test Suite', () => {
    const sourcePath = '/path/to/my/file.pdf' as Path;
    const workspaceFolder: vscode.WorkspaceFolder = {
        uri: vscode.Uri.file('/path/to'),
        name: 'my-workspace',
        index: 0
    };

    let clock: sinon.SinonFakeTimers;

    setup(() => {
        clock = sinon.useFakeTimers(1755592839354);
    });

    teardown(() => {
        clock.restore();
    });

    test('should replace ${workspaceFolder}', () => {
        const template = '${workspaceFolder}/output.pdf' as TemplatePath;
        const expected = path.join(workspaceFolder.uri.fsPath, 'output.pdf');
        assert.strictEqual(generatePathFromTemplate(template, sourcePath, workspaceFolder), expected);
    });

    test('should replace ${workspaceFolderBasename}', () => {
        const template = '${workspaceFolderBasename}/output.pdf' as TemplatePath;
        const expected = path.join(workspaceFolder.name, 'output.pdf');
        assert.strictEqual(generatePathFromTemplate(template, sourcePath, workspaceFolder), expected);
    });

    test('should replace ${file}', () => {
        const template = '${file}.bak' as TemplatePath;
        const expected = `${sourcePath}.bak`;
        assert.strictEqual(generatePathFromTemplate(template, sourcePath, workspaceFolder), expected);
    });

    test('should replace ${relativeFile}', () => {
        const template = 'bak/${relativeFile}' as TemplatePath;
        const expected = path.join('bak', path.relative(workspaceFolder.uri.fsPath, sourcePath));
        assert.strictEqual(generatePathFromTemplate(template, sourcePath, workspaceFolder), expected);
    });

    test('should replace ${relativeFileDirname}', () => {
        const template = '${relativeFileDirname}/output.pdf' as TemplatePath;
        const expected = path.join(path.dirname(path.relative(workspaceFolder.uri.fsPath, sourcePath)), 'output.pdf');
        assert.strictEqual(generatePathFromTemplate(template, sourcePath, workspaceFolder), expected);
    });

    test('should replace ${fileBasename}', () => {
        const template = 'pre_${fileBasename}' as TemplatePath;
        const expected = `pre_${path.basename(sourcePath)}`;
        assert.strictEqual(generatePathFromTemplate(template, sourcePath, workspaceFolder), expected);
    });

    test('should replace ${fileBasenameNoExtension}', () => {
        const template = '${fileBasenameNoExtension}.txt' as TemplatePath;
        const expected = `${path.basename(sourcePath, path.extname(sourcePath))}.txt`;
        assert.strictEqual(generatePathFromTemplate(template, sourcePath, workspaceFolder), expected);
    });

    test('should replace ${fileDirname}', () => {
        const template = '${fileDirname}/newfile.txt' as TemplatePath;
        const expected = path.join(path.dirname(sourcePath), 'newfile.txt');
        assert.strictEqual(generatePathFromTemplate(template, sourcePath, workspaceFolder), expected);
    });

    test('should replace ${fileExtname}', () => {
        const template = 'file${fileExtname}' as TemplatePath;
        const expected = `file${path.extname(sourcePath)}`;
        assert.strictEqual(generatePathFromTemplate(template, sourcePath, workspaceFolder), expected);
    });

    test('should replace ${page}', () => {
        const template = 'page-${page}.pdf' as TemplatePath;
        const page = '3';
        const expected = `page-${page}.pdf`;
        assert.strictEqual(generatePathFromTemplate(template, sourcePath, workspaceFolder, page), expected);
    });

    test('should replace ${dateNow}', () => {
        const template = 'backup-${dateNow}' as TemplatePath;
        assert.strictEqual(generatePathFromTemplate(template, sourcePath, workspaceFolder), 'backup-1755592839354');
    });

    test('should handle multiple replacements', () => {
        const template = '${fileDirname}/${fileBasenameNoExtension}-${page}.png' as TemplatePath;
        const page = '1';
        const expected = path.join(path.dirname(sourcePath), `${path.basename(sourcePath, path.extname(sourcePath))}-${page}.png`);
        assert.strictEqual(generatePathFromTemplate(template, sourcePath, workspaceFolder, page), expected);
    });

    test('should handle multiple replacements all', () => {
        const inputPath = '/path/to/my/file.pdf';
        const workspaceFolder: vscode.WorkspaceFolder = { uri: vscode.Uri.file('/workspace'), name: 'my-workspace', index: 0 };
        const page = 'tab';

        assert.strictEqual(generatePathFromTemplate('${workspaceFolder}/output.pdf' as TemplatePath, inputPath as Path, workspaceFolder), path.join('/workspace', 'output.pdf'));
        assert.strictEqual(generatePathFromTemplate('${workspaceFolderBasename}/output.pdf' as TemplatePath, inputPath as Path, workspaceFolder), path.join('my-workspace', 'output.pdf'));
        assert.strictEqual(generatePathFromTemplate('${file}.pdf' as TemplatePath, inputPath as Path, workspaceFolder, page), '/path/to/my/file.pdf.pdf');
        assert.strictEqual(generatePathFromTemplate('${relativeFile}.pdf' as TemplatePath, inputPath as Path, workspaceFolder, page), '../path/to/my/file.pdf.pdf');
        assert.strictEqual(generatePathFromTemplate('${relativeFileDirname}/output.pdf' as TemplatePath, inputPath as Path, workspaceFolder), path.join('../path/to/my', 'output.pdf'));
        assert.strictEqual(generatePathFromTemplate('abc/${fileBasename}' as TemplatePath, inputPath as Path, workspaceFolder, page), 'abc/file.pdf');
        assert.strictEqual(generatePathFromTemplate('${fileBasenameNoExtension}.png' as TemplatePath, inputPath as Path, workspaceFolder, page), 'file.png');
        assert.strictEqual(generatePathFromTemplate('${fileDirname}/output.pdf' as TemplatePath, inputPath as Path, workspaceFolder, page), path.join('/path/to/my', 'output.pdf'));
        assert.strictEqual(generatePathFromTemplate('output${fileExtname}' as TemplatePath, inputPath as Path, workspaceFolder, page), 'output.pdf');
        assert.strictEqual(generatePathFromTemplate('output-${page}.pdf' as TemplatePath, inputPath as Path, workspaceFolder, page), 'output-tab.pdf');
        assert.strictEqual(generatePathFromTemplate('output-${dateNow}.pdf' as TemplatePath, inputPath as Path, workspaceFolder, page), `output-${1755592839354}.pdf`);
        assert.strictEqual(generatePathFromTemplate('${fileDirname}/${fileBasenameNoExtension}-crop.pdf' as TemplatePath, inputPath as Path, workspaceFolder, page), path.join('/path/to/my', 'file-crop.pdf'));
        assert.strictEqual(generatePathFromTemplate(inputPath as TemplatePath, inputPath as Path, workspaceFolder, page), inputPath);
    });
});
