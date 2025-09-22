import * as assert from 'assert';

import * as vscode from 'vscode';

import { createConvertPdfToImageCommand } from '../../commands/convert_pdf_to_image';
import { ExecPath } from '../../type';

suite('Convert PDF to Image Suite', () => {
    suiteTeardown(() => {
        vscode.window.showInformationMessage('All tests done!');
    });

    test('Command test', () => {
        assert.strictEqual(createConvertPdfToImageCommand('pdftocairo' as ExecPath, 'C:\\Users\\test\\file.pdf', 'C:\\Users\\test\\file.png', ['-png', '-r', '300']), 'pdftocairo "C:\\Users\\test\\file.pdf" "C:\\Users\\test\\file.png" -png -r 300');

        assert.strictEqual(createConvertPdfToImageCommand('pdftocairo' as ExecPath, 'C:\\Users\\another_user\\document with spaces.pdf', 'C:\\Users\\another_user\\document with spaces.jpeg', ['-jpeg', '-r', '150']), 'pdftocairo "C:\\Users\\another_user\\document with spaces.pdf" "C:\\Users\\another_user\\document with spaces.jpeg" -jpeg -r 150');

        assert.strictEqual(createConvertPdfToImageCommand('pdftocairo' as ExecPath, '/home/testuser/file.pdf', '/home/testuser/file.png', ['-png', '-r', '300']), 'pdftocairo "/home/testuser/file.pdf" "/home/testuser/file.png" -png -r 300');

        assert.strictEqual(createConvertPdfToImageCommand('pdftocairo' as ExecPath, '/home/another user/document with spaces.pdf', '/home/another user/document with spaces.jpeg', ['-jpeg', '-r', '150']), 'pdftocairo "/home/another user/document with spaces.pdf" "/home/another user/document with spaces.jpeg" -jpeg -r 150');
    });
});
