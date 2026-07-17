import * as vscode from 'vscode';

export interface LatexSnippetConfig {
  figurePlacementOptions: string[];
  figureAlignmentOptions: string[];
  figureGraphicsOptions: string[];
  subfigureVerticalAlignmentOptions: string[];
  subfigureWidthOptions: string[];
  subfigureSpacingOptions: string[];
}

export class LatexSnippet {
  readonly snippet = new vscode.SnippetString();
  private tabstop = 1;

  constructor(private readonly config: LatexSnippetConfig) {}

  wrapEnvironment(name: string, callback: () => void): this {
    this.snippet.appendText(`\\begin{${name}}`);
    callback();
    this.lineBreak();
    this.snippet.appendText(`\\end{${name}}`);
    return this;
  }

  appendFigurePlacement(): this {
    return this.appendOption(this.config.figurePlacementOptions);
  }

  appendFigureAlignment(): this {
    return this.appendOption(this.config.figureAlignmentOptions);
  }

  appendGraphicsOptions(): this {
    return this.appendOption(this.config.figureGraphicsOptions);
  }

  appendSubfigureVerticalAlignment(): this {
    return this.appendOption(this.config.subfigureVerticalAlignmentOptions);
  }

  appendSubfigureWidth(): this {
    return this.appendOption(this.config.subfigureWidthOptions);
  }

  appendSubfigureSpacing(): this {
    return this.appendOption(this.config.subfigureSpacingOptions);
  }

  appendCommand(name: string, option?: () => void, argument?: () => void): this {
    this.snippet.appendText(`\\${name}`);
    if (option) {
      option();
    }
    if (argument) {
      this.snippet.appendText('{');
      argument();
      this.snippet.appendText('}');
    }
    return this;
  }

  appendText(value: string): this {
    this.snippet.appendText(value);
    return this;
  }

  appendPlaceholder(value: string): this {
    this.snippet.appendPlaceholder(value, this.tabstop);
    this.tabstop += 1;
    return this;
  }

  lineBreak(): this {
    this.snippet.appendText('\n\t');
    return this;
  }

  lineEnd(): this {
    this.snippet.appendText('\n');
    return this;
  }

  convertToLatexPath(filePath: string): string {
    return filePath.split(/[\\/]+/).join('/');
  }

  private appendOption(options: string[]): this {
    if (options.length > 1) {
      this.snippet.appendChoice(options, this.tabstop);
      this.tabstop += 1;
      return this;
    }

    this.snippet.appendText(options[0] ?? '');
    return this;
  }
}
