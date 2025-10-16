import * as assert from 'assert';

import * as vscode from 'vscode';

import { execFileInWorkspace } from '../../utils/exec_file_in_workspace';

suite('exec_file_in_workspace Test Suite', () => {
    const workspaceFolder: vscode.WorkspaceFolder = {
        uri: vscode.Uri.file('/'),
        name: 'test-workspace',
        index: 0
    };

    test('should execute command and return stdout', async () => {
        const command = 'node';
        const args = ['-e', 'console.log("file1 file2")'];
        const expectedStdout = 'file1 file2';

        const stdout = await execFileInWorkspace(command, args, workspaceFolder);

        assert.strictEqual(stdout.trim(), expectedStdout);
    });

    test('should throw an error if stderr is not empty', async () => {
        const command = 'node';
        const args = ['-e', 'console.error("command not found")'];
        const expectedStderr = 'command not found';

        await assert.rejects(
            execFileInWorkspace(command, args, workspaceFolder),
            (err: Error) => {
                assert.ok(err.message.includes(expectedStderr));
                return true;
            }
        );
    });

    test('should throw an error if execFile returns an error', async () => {
        const command = 'a_non_existent_command_that_will_fail';
        const args: string[] = [];

        await assert.rejects(
            execFileInWorkspace(command, args, workspaceFolder),
            (err: Error & { code: string }) => {
                assert.strictEqual(err.code, 'ENOENT');
                return true;
            }
        );
    });
});
