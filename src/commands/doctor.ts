import { exec } from 'child_process';

import * as vscode from 'vscode';

import { AppConfig, getShell } from '../configuration';

function checkCommand(command: string, toolName: string, outputChannel: vscode.OutputChannel): Promise<boolean> {
    return new Promise((resolve) => {
        exec(
            command,
            {
                'shell': getShell(),
            },
            (error) => {
                if (error) {
                    outputChannel.appendLine(`[✖] ${toolName} is not installed or not in your PATH.`);
                    outputChannel.appendLine(`    Command: ${command}`);
                    outputChannel.appendLine(`    Error: ${error.message}`);
                    resolve(false);
                } else {
                    outputChannel.appendLine(`[✔] ${toolName} is installed.`);
                    resolve(true);
                }
            });
    });
}

export async function doctor(config: AppConfig): Promise<void> {
    const outputChannel = vscode.window.createOutputChannel('LaTeX Graphics Helper');
    outputChannel.clear();
    outputChannel.show();
    outputChannel.appendLine('Checking for required tools...');

    const drawioCommand = process.platform === 'darwin' ? `"${config.execPathDrawio}" --help` : `"${config.execPathDrawio}" --version`;

    await checkCommand(drawioCommand, 'draw.io', outputChannel);
    await checkCommand(`"${config.execPathPdfcrop}" --version`, 'pdfcrop', outputChannel);
    await checkCommand(`"${config.execPathPdftocairo}" -v`, 'pdftocairo', outputChannel);
    await checkCommand(`"${config.execPathInkscape}" --version`, 'inkscape', outputChannel);

    outputChannel.appendLine('\nCheck complete.');
}
