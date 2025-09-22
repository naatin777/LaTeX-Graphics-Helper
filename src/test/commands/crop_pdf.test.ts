import * as assert from 'assert';

import * as vscode from 'vscode';

import { createCropPdfCommand } from '../../commands/crop_pdf';
import { ExecPath } from '../../type';

suite('Crop PDF Suite', () => {
    suiteTeardown(() => {
        vscode.window.showInformationMessage('All tests done!');
    });

    test('Command test', () => {
        assert.strictEqual(createCropPdfCommand('pdfcrop' as ExecPath, 'C:\\Users\\test\\document.pdf', 'C:\\Users\\test\\document_cropped.pdf'), 'pdfcrop "C:\\Users\\test\\document.pdf" "C:\\Users\\test\\document_cropped.pdf"');

        assert.strictEqual(createCropPdfCommand('pdfcrop' as ExecPath, 'C:\\Users\\another_user\\my document with spaces.pdf', 'C:\\Users\\another_user\\my document with spaces_cropped.pdf'), 'pdfcrop "C:\\Users\\another_user\\my document with spaces.pdf" "C:\\Users\\another_user\\my document with spaces_cropped.pdf"');

        assert.strictEqual(createCropPdfCommand('pdfcrop' as ExecPath, '/home/testuser/document.pdf', '/home/testuser/document_cropped.pdf'), 'pdfcrop "/home/testuser/document.pdf" "/home/testuser/document_cropped.pdf"');

        assert.strictEqual(createCropPdfCommand('pdfcrop' as ExecPath, '/home/another user/my document with spaces.pdf', '/home/another user/my document with spaces_cropped.pdf'), 'pdfcrop "/home/another user/my document with spaces.pdf" "/home/another user/my document with spaces_cropped.pdf"');
    });
});
