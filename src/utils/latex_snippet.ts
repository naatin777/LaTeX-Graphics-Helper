import path from 'path';

import * as vscode from 'vscode';

import { AppConfig } from '../configuration';

export class LatexSnippet {
    appConfig: AppConfig;
    snippet: vscode.SnippetString;
    indent: number;
    number: number;

    constructor(appConfig: AppConfig) {
        this.appConfig = appConfig;
        this.snippet = new vscode.SnippetString();
        this.indent = 0;
        this.number = 1;
    }

    appendText(text: string) {
        this.snippet.appendText(text);
        return this;
    }

    appendPlaceholder(text: string) {
        this.snippet.appendPlaceholder(text, this.number++);
        return this;
    }

    appendFigurePlacement() {
        const figurePlacementOptions = this.appConfig.figurePlacementOptions;
        if (figurePlacementOptions.length > 1) {
            this.snippet.appendChoice(figurePlacementOptions, this.number++);
        } else {
            this.snippet.appendText(figurePlacementOptions[0] ?? '');
        }
        return this;
    }

    appendFigureAlignment() {
        const figureAlignmentOptions = this.appConfig.figureAlignmentOptions;
        if (figureAlignmentOptions.length > 1) {
            this.snippet.appendChoice(figureAlignmentOptions, this.number++);
        } else {
            this.snippet.appendText(figureAlignmentOptions[0] ?? '');
        }
        return this;
    }

    appendGraphicsOptions() {
        const graphicsOptions = this.appConfig.figureGraphicsOptions;
        if (graphicsOptions.length > 1) {
            this.snippet.appendChoice(graphicsOptions, this.number++);
        } else {
            this.snippet.appendText(graphicsOptions[0] ?? '');
        }
        return this;
    }

    appendSubfigureVerticalAlignment() {
        const subfigureVerticalAlignmentOptions = this.appConfig.subfigureVerticalAlignmentOptions;
        if (subfigureVerticalAlignmentOptions.length > 1) {
            this.snippet.appendChoice(subfigureVerticalAlignmentOptions, this.number++);
        } else {
            this.snippet.appendText(subfigureVerticalAlignmentOptions[0] ?? '');
        }
        return this;
    }

    appendSubfigureWidth() {
        const subfigureWidthOptions = this.appConfig.subfigureWidthOptions;
        if (subfigureWidthOptions.length > 1) {
            this.snippet.appendChoice(subfigureWidthOptions, this.number++);
        } else {
            this.snippet.appendText(subfigureWidthOptions[0] ?? '');
        }
        return this;
    }

    appendSubfigureSpacing() {
        const subfigureSpacingOptions = this.appConfig.subfigureSpacingOptions;
        if (subfigureSpacingOptions.length > 1) {
            this.snippet.appendChoice(subfigureSpacingOptions, this.number++);
        } else {
            this.snippet.appendText(subfigureSpacingOptions[0] ?? '');
        }
        return this;
    }

    appendCommand(name: string, option: (() => void) | undefined, arg: (() => void) | undefined) {
        this.snippet.appendText(`\\${name}`);
        option?.();
        if (arg) {
            this.snippet.appendText('{');
            arg();
            this.snippet.appendText('}');
        }
        return this;
    }

    wrapEnvironment(environment: string, callback: () => void) {
        this.snippet.appendText(`${'\t'.repeat(this.indent)}\\begin{${environment}}`);
        this.indent++;
        callback();
        this.indent--;
        this.snippet.appendText(`${'\t'.repeat(this.indent)}\\end{${environment}}`);
    }

    lineBreak() {
        this.snippet.appendText(`\n${'\t'.repeat(this.indent)}`);
    }

    lineEnd() {
        this.snippet.appendText('\n');
    }

    convertToLatexPath(filePath: string): string {
        return path.normalize(filePath).split(/[\\\/]/g).join(path.posix.sep);
    }

}
