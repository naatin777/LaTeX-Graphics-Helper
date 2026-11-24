import type { ExecFileOptions } from 'node:child_process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type * as vscode from 'vscode';

export interface ExecFileInWorkspaceOptions {
    /**
     * Ignore stderr when the process exits successfully. Some GUI-based CLIs
     * (notably Draw.io on macOS) emit harmless sandbox warnings on first run.
     */
    allowStderr?: boolean;
}

export async function execFileInWorkspace(
    command: string,
    args: string[],
    workspaceFolder: vscode.WorkspaceFolder,
    options: ExecFileInWorkspaceOptions = {},
): Promise<string> {
    const execOptions: ExecFileOptions = {
        cwd: workspaceFolder.uri.fsPath,
    };

    const execFileAsync = promisify(execFile);
    const result = await execFileAsync(command, args, execOptions);

    if (result.stderr && !options.allowStderr) {
        throw new Error(result.stderr.toString());
    }

    return result.stdout.toString();
}
