import * as vscode from 'vscode';

import type { LatexSnippetConfig } from './latex_snippet.js';

export interface LatexInsertionConfig extends LatexSnippetConfig {
  outputPathClipboardImage: string;
}

export function readLatexInsertionConfig(): LatexInsertionConfig {
  const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');

  return {
    outputPathClipboardImage: configuration.get<string>('outputPath.clipboardImage', '${fileDirname}/${dateNow}'),
    figurePlacementOptions: configuration.get<string[]>('figure.placementOptions', ['[H]']),
    figureAlignmentOptions: configuration.get<string[]>('figure.alignmentOptions', ['\\centering']),
    figureGraphicsOptions: configuration.get<string[]>('figure.graphicsOptions', ['[width=1.0\\linewidth]']),
    subfigureVerticalAlignmentOptions: configuration.get<string[]>('subfigure.verticalAlignmentOptions', ['[t]']),
    subfigureWidthOptions: configuration.get<string[]>('subfigure.widthOptions', ['{0.45\\linewidth}']),
    subfigureSpacingOptions: configuration.get<string[]>('subfigure.spacingOptions', ['\\hspace{0.01\\linewidth}']),
  };
}
