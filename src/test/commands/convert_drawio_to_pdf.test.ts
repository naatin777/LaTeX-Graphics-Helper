import * as assert from 'assert';

import * as vscode from 'vscode';

import { createConvertDrawioToPdfCommand } from '../../commands/convert_drawio_to_pdf';
import { ExecPath } from '../../type';

suite('Convert Drawio to PDF Suite', () => {
    suiteTeardown(() => {
        vscode.window.showInformationMessage('All tests done!');
    });

    test('Command test', () => {
        assert.ok(createConvertDrawioToPdfCommand('draw.io' as ExecPath, 'C:\\Users\\test\\file.dio', 'C:\\Users\\test\\file.pdf'), 'draw.io "C:\\Users\\test\\file.dio" -o "C:\\Users\\test\\file.pdf" -xf pdf -t -a');

        assert.ok(createConvertDrawioToPdfCommand('draw.io' as ExecPath, 'C:\\Users\\another_user\\my drawio file with spaces.dio', 'C:\\Users\\another_user\\my drawio file with spaces.pdf'), 'draw.io "C:\\Users\\another_user\\my drawio file with spaces.dio" -o "C:\\Users\\another_user\\my drawio file with spaces.pdf" -xf pdf -t -a');

        assert.ok(createConvertDrawioToPdfCommand('draw.io' as ExecPath, '/home/testuser/file.dio', '/home/testuser/file.pdf'), 'draw.io "/home/testuser/file.dio" -o "/home/testuser/file.pdf" -xf pdf -t -a');

        assert.ok(createConvertDrawioToPdfCommand('draw.io' as ExecPath, '/home/another user/my drawio file with spaces.dio', '/home/another user/my drawio file with spaces.pdf'), 'draw.io "/home/another user/my drawio file with spaces.dio" -o "/home/another user/my drawio file with spaces.pdf" -xf pdf -t -a');
    });
});
