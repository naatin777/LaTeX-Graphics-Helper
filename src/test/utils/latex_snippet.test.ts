import * as assert from 'assert';

import { AppConfig } from '../../configuration';
import { LatexSnippet } from '../../utils/latex_snippet';

suite('LatexSnippet Test Suite', () => {
  let appConfig: AppConfig;

  setup(() => {
    appConfig = {
      figurePlacementOptions: ['h', 't', 'b', 'p', '!'],
      figureAlignmentOptions: ['\\centering'],
      figureGraphicsOptions: ['[width=\\linewidth]', '[width=0.8\\linewidth]'],
      subfigureVerticalAlignmentOptions: ['t', 'c', 'b'],
      subfigureWidthOptions: ['0.45\\linewidth', '0.9\\linewidth'],
      subfigureSpacingOptions: ['\\hfill', '\\quad'],
    } as AppConfig;
  });

  test('should append text', () => {
    const snippet = new LatexSnippet(appConfig);
    snippet.appendText('hello');
    assert.strictEqual(snippet.snippet.value, 'hello');
  });

  test('should append placeholder', () => {
    const snippet = new LatexSnippet(appConfig);
    snippet.appendPlaceholder('caption');
    assert.strictEqual(snippet.snippet.value, '${1:caption}');
  });

  test('should append choices for figure placement', () => {
    const snippet = new LatexSnippet(appConfig);
    snippet.appendFigurePlacement();
    assert.strictEqual(snippet.snippet.value, '${1|h,t,b,p,!|}');
  });

  test('should append single option for figure placement if only one', () => {
    appConfig.figurePlacementOptions = ['[H]'];
    const snippet = new LatexSnippet(appConfig);
    snippet.appendFigurePlacement();
    assert.strictEqual(snippet.snippet.value, '[H]');
  });

  test('should append choices for figure alignment', () => {
    appConfig.figureAlignmentOptions = ['\centering'];
    const snippet = new LatexSnippet(appConfig);
    snippet.appendFigureAlignment();
    assert.strictEqual(snippet.snippet.value, '\centering');
  });

  test('should append choices for graphics options', () => {
    const snippet = new LatexSnippet(appConfig);
    snippet.appendGraphicsOptions();
    assert.strictEqual(
      snippet.snippet.value,
      '${1|[width=\\\\linewidth],[width=0.8\\\\linewidth]|}',
    );
  });

  test('should append command with option and argument', () => {
    const snippet = new LatexSnippet(appConfig);
    snippet.appendCommand(
      'includegraphics',
      () => snippet.appendGraphicsOptions(),
      () => snippet.appendText('path/to/image'),
    );
    assert.strictEqual(
      snippet.snippet.value,
      '\\\\includegraphics${1|[width=\\\\linewidth],[width=0.8\\\\linewidth]|}{path/to/image\\}',
    );
  });

  test('should wrap content in an environment', () => {
    const snippet = new LatexSnippet(appConfig);
    snippet.wrapEnvironment('figure', () => {
      snippet.lineBreak();
      snippet.appendText('content').lineEnd();
    });
    assert.strictEqual(
      snippet.snippet.value,
      '\\\\begin{figure\\}\n\tcontent\n\\\\end{figure\\}',
    );
  });

  test('should handle indentation', () => {
    const snippet = new LatexSnippet(appConfig);
    snippet.wrapEnvironment('figure', () => {
      snippet.lineBreak();
      snippet.wrapEnvironment('center', () => {
        snippet.lineBreak();
        snippet.appendText('content');
      });
      snippet.lineEnd();
    });
    assert.strictEqual(
      snippet.snippet.value,
      '\\\\begin{figure\\}\n\t\t\\\\begin{center\\}\n\t\tcontent\t\\\\end{center\\}\n\\\\end{figure\\}',
    );
  });

  test('should convert path to posix path', () => {
    const snippet = new LatexSnippet(appConfig);
    assert.strictEqual(
      snippet.convertToLatexPath('C:\\Users\\test\\file.txt'),
      'C:/Users/test/file.txt',
    );
    assert.strictEqual(
      snippet.convertToLatexPath('C:/Users/test/file.txt'),
      'C:/Users/test/file.txt',
    );
    assert.strictEqual(
      snippet.convertToLatexPath('/home/test/file.txt'),
      '/home/test/file.txt',
    );
    assert.strictEqual(
      snippet.convertToLatexPath('home/test/file.txt'),
      'home/test/file.txt',
    );
    assert.strictEqual(
      snippet.convertToLatexPath('../home/test/../file.txt'),
      '../home/file.txt',
    );
  });
});
