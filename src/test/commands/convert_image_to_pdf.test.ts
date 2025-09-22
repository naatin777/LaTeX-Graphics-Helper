import * as assert from 'assert';

import * as vscode from 'vscode';

import { createConvertImageToPdfCommand } from '../../commands/convert_image_to_pdf';
import { ExecPath } from '../../type';

suite('Convert Image to PDF Suite', () => {
    suiteTeardown(() => {
        vscode.window.showInformationMessage('All tests done!');
    });

    test('Command test', () => {
        assert.strictEqual(createConvertImageToPdfCommand('inkscape' as ExecPath, 'C:\\Users\\test\\image.png', 'C:\\Users\\test\\image.pdf'), 'inkscape "C:\\Users\\test\\image.png" -o "C:\\Users\\test\\image.pdf" --export-type=pdf --export-area-drawing');

        assert.strictEqual(createConvertImageToPdfCommand('inkscape' as ExecPath, 'C:\\Users\\another_user\\my image with spaces.jpg', 'C:\\Users\\another_user\\my image with spaces.pdf'), 'inkscape "C:\\Users\\another_user\\my image with spaces.jpg" -o "C:\\Users\\another_user\\my image with spaces.pdf" --export-type=pdf --export-area-drawing');

        assert.strictEqual(createConvertImageToPdfCommand('inkscape' as ExecPath, '/home/testuser/image.png', '/home/testuser/image.pdf'), 'inkscape "/home/testuser/image.png" -o "/home/testuser/image.pdf" --export-type=pdf --export-area-drawing');

        assert.strictEqual(createConvertImageToPdfCommand('inkscape' as ExecPath, '/home/another user/my image with spaces.svg', '/home/another user/my image with spaces.pdf'), 'inkscape "/home/another user/my image with spaces.svg" -o "/home/another user/my image with spaces.pdf" --export-type=pdf --export-area-drawing');
    });
});
