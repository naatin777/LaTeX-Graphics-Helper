import type { ExecFileOptions } from 'node:child_process';
import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';

import type * as vscode from 'vscode';

import { logger } from '../logger';

function workspaceExecEnv(command: string): NodeJS.ProcessEnv {
    const commandDirectory = path.dirname(command);
    const pathPrefix =
        commandDirectory.length > 0 && commandDirectory !== '.' && fs.existsSync(commandDirectory)
            ? `${commandDirectory}${path.delimiter}`
            : '';

    return {
        ...process.env,
        PATH: pathPrefix.length > 0 ? `${pathPrefix}${process.env.PATH ?? ''}` : process.env.PATH,
    };
}

export async function execFileInWorkspace(
    command: string,
    args: string[],
    workspaceFolder: vscode.WorkspaceFolder,
): Promise<string> {
    const options: ExecFileOptions = {
        cwd: workspaceFolder.uri.fsPath,
        env: workspaceExecEnv(command),
    };

    logger.info(`exec: ${command} ${args.join(' ')}`);

    const execFileAsync = promisify(execFile);
    const result = await execFileAsync(command, args, options);

    const stderr = result.stderr?.toString().trim();
    if (stderr) {
        logger.warn(`exec stderr: ${command} — ${stderr}`);
    }

    return result.stdout.toString();
}
