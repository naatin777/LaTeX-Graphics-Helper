import * as vscode from 'vscode';

import type { LogLevel } from './type';

export class Logger {
    private readonly channel: vscode.OutputChannel;
    private readonly lines: string[] = [];

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
        const line = `[${time}] ${type}: ${message}`;
        this.lines.push(line);
        this.channel.appendLine(line);
    }

    public getLines(): readonly string[] {
        return this.lines;
    }

    public show(): void {
        this.channel.show();
    }

    public clear(): void {
        this.lines.length = 0;
        this.channel.clear();
    }
}

export const logger = new Logger();
