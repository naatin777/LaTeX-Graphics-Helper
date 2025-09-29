import * as vscode from 'vscode';

import { LogLevel } from './type';

class Logger {
    private readonly channel: vscode.OutputChannel;

    constructor() {
        this.channel = vscode.window.createOutputChannel('LaTeX Graphics Helper');
    }

    public log(type: LogLevel, message: string): void {
        const time = new Date().toLocaleTimeString();
        this.channel.appendLine(`[${time}] ${type}: ${message}`);
    }

    public show(): void {
        this.channel.show();
    }

    public clear(): void {
        this.channel.clear();
    }
}

export const logger = new Logger();
