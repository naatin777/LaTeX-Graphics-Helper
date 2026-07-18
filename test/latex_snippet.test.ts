import assert from 'node:assert/strict';

import { LatexSnippet } from '../src/edit_provider/latex_snippet.js';

suite('LaTeX snippet option builder', () => {
  test('figure alignmentも他のoptionと同じchoice処理を使う', () => {
    const snippet = new LatexSnippet({
      figurePlacementOptions: ['[H]', '[t]'],
      figureAlignmentOptions: ['\\raggedleft', '\\centering'],
      figureGraphicsOptions: ['[width=1.0\\linewidth]'],
      subfigureVerticalAlignmentOptions: ['[t]'],
      subfigureWidthOptions: ['{0.45\\linewidth}'],
      subfigureSpacingOptions: ['\\hfill'],
    });

    snippet.appendFigurePlacement().appendFigureAlignment();

    assert.equal(snippet.snippet.value, '${1|[H],[t]|}${2|\\\\raggedleft,\\\\centering|}');
  });
});
