import type { ExecFileOptions } from 'node:child_process';
import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';

import type * as vscode from 'vscode';

import { logger } from '../logger';

export async function execFileInWorkspace(
    command: string,
    args: string[],
    workspaceFolder: vscode.WorkspaceFolder,
): Promise<string> {
    const commandDirectory = path.dirname(command);
    const pathPrefix =
        commandDirectory.length > 0 && commandDirectory !== '.' && fs.existsSync(commandDirectory)
            ? `${commandDirectory}${path.delimiter}`
            : '';

    const options: ExecFileOptions = {
        cwd: workspaceFolder.uri.fsPath,
        env: {
            ...process.env,
            PATH: `${pathPrefix}${process.env.PATH ?? ''}`,
        },
    };

    logger.info(`exec: ${command} ${args.join(' ')}`);

    const execFileAsync = promisify(execFile);
    const result = await execFileAsync(command, args, options);

    if (result.stderr) {
        const message = result.stderr.toString();
        logger.error(`exec failed: ${command} — ${message}`);
        throw new Error(message);
    }

    return result.stdout.toString();
}
