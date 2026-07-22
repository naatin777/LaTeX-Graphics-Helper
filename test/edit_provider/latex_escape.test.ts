import assert from 'node:assert/strict';

import { escapeLatex, escapeLatexLabel } from '../../src/edit_provider/latex_escape.js';

suite('LaTeX text escaping', () => {
  test('caption textでLaTeXの特殊文字をすべてescapeする', () => {
    assert.strictEqual(
      escapeLatex('a\\b{c}$d&e#f%g_h^i~j'),
      'a\\textbackslash{}b\\{c\\}\\$d\\&e\\#f\\%g\\_h\\textasciicircum{}i\\textasciitilde{}j',
    );
  });

  test('labelに不適切な文字を区切りへ置換する', () => {
    assert.strictEqual(escapeLatexLabel('dir\\file name{a}$b&c#d%e_f^g~h'), 'dir-file-name-a-b-c-d-e-f-g-h');
  });

  test('通常の日本語と英数字は変更しない', () => {
    assert.strictEqual(escapeLatex('図表Example-01'), '図表Example-01');
    assert.strictEqual(escapeLatexLabel('図表Example-01'), '図表Example-01');
  });
});
