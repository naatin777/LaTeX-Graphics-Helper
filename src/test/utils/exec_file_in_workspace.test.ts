import * as assert from 'node:assert';

import * as vscode from 'vscode';

import { execFileInWorkspace } from '../../utils/exec_file_in_workspace';

suite('exec_file_in_workspace のテストスイート', () => {
    const workspaceFolder: vscode.WorkspaceFolder = {
        uri: vscode.Uri.file('/'),
        name: 'test-workspace',
        index: 0,
    };

    test('コマンドを実行して標準出力を返す', async () => {
        const command = 'node';
        const args = ['-e', 'console.log("file1 file2")'];
        const expectedStdout = 'file1 file2';

        const stdout = await execFileInWorkspace(command, args, workspaceFolder);

        assert.strictEqual(stdout.trim(), expectedStdout);
    });

    test('標準エラー出力が空でない場合はエラーを投げる', async () => {
        const command = 'node';
        const args = ['-e', 'console.error("command not found")'];
        const expectedStderr = 'command not found';

        await assert.rejects(execFileInWorkspace(command, args, workspaceFolder), (err: Error) => {
            assert.ok(err.message.includes(expectedStderr));
            return true;
        });
    });

    test('execFile がエラーを返した場合はエラーを投げる', async () => {
        const command = 'a_non_existent_command_that_will_fail';
        const args: string[] = [];

        await assert.rejects(
            execFileInWorkspace(command, args, workspaceFolder),
            (err: Error & { code: string }) => {
                assert.strictEqual(err.code, 'ENOENT');
                return true;
            },
        );
    });
});
