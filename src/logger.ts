import * as vscode from 'vscode';

import { LogLevel } from './type';

class Logger {
    private readonly channel: vscode.OutputChannel;

    constructor() {
        this.channel = vscode.window.createOutputChannel('LaTeX Graphics Helper');
    }

    public info(message: string): void {
        this.log('info', message);
    }

    public warn(message: string): void {
        this.log('warn', message);
    }

    public error(message: string): void {
        this.log('error', message);
    }

    private log(type: LogLevel, message: string): void {
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
