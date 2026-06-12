import type { ExecFileOptions } from 'node:child_process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type * as vscode from 'vscode';

export async function execFileInWorkspace(
    command: string,
    args: string[],
    workspaceFolder: vscode.WorkspaceFolder,
): Promise<string> {
    const options: ExecFileOptions = {
        cwd: workspaceFolder.uri.fsPath,
    };

    const execFileAsync = promisify(execFile);
    const result = await execFileAsync(command, args, options);

    if (result.stderr) {
        throw new Error(result.stderr.toString());
    }

    return result.stdout.toString();
}
