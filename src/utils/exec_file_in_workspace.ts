// src/utils/execInWorkspace.ts

import { execFile, ExecFileOptions } from 'child_process';
import { promisify } from 'util';

import * as vscode from 'vscode';

export async function execFileInWorkspace(
    command: string,
    args: string[],
    workspaceFolder: vscode.WorkspaceFolder
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
