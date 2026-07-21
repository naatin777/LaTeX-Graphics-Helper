/* oxlint-disable vitest/expect-expect */

import assert from 'node:assert/strict';

import { renderTemplate, type TemplateContext } from '../src/edit_provider/latex_template.js';

suite('LaTeX template renderer', () => {
  const ctx: TemplateContext = {
    path: 'figures/graph.pdf',
    name: 'graph',
    ext: 'pdf',
    page: 2,
    dir: 'figures',
  };

  test('replaces ${path} with relative path', () => {
    const result = renderTemplate('\\includegraphics{${path}}', ctx);
    assert.strictEqual(result, '\\includegraphics{figures/graph.pdf}');
  });

  test('replaces ${name} with basename without extension', () => {
    const result = renderTemplate('\\label{fig:${name}}', ctx);
    assert.strictEqual(result, '\\label{fig:graph}');
  });

  test('replaces ${ext} with extension', () => {
    const result = renderTemplate('File type: ${ext}', ctx);
    assert.strictEqual(result, 'File type: pdf');
  });

  test('replaces ${page} with page number', () => {
    const result = renderTemplate('page=${page}', ctx);
    assert.strictEqual(result, 'page=2');
  });

  test('replaces ${dir} with directory', () => {
    const result = renderTemplate('from ${dir}', ctx);
    assert.strictEqual(result, 'from figures');
  });

  test('renders full figure template', () => {
    const template = [
      '\\begin{figure}[H]',
      '  \\centering',
      '  \\includegraphics[width=\\linewidth]{${path}}',
      '  \\caption{${name}}',
      '  \\label{fig:${name}}',
      '\\end{figure}',
    ].join('\n');
    const expected = [
      '\\begin{figure}[H]',
      '  \\centering',
      '  \\includegraphics[width=\\linewidth]{figures/graph.pdf}',
      '  \\caption{graph}',
      '  \\label{fig:graph}',
      '\\end{figure}',
    ].join('\n');
    assert.strictEqual(renderTemplate(template, ctx), expected);
  });

  test('unknown variables are left as-is', () => {
    const result = renderTemplate('${unknown}', ctx);
    assert.strictEqual(result, '${unknown}');
  });
});
