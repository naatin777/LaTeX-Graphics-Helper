import * as assert from 'node:assert';

import type { AppConfig } from '../../configuration';
import { LatexSnippet } from '../../utils/latex_snippet';

suite('LatexSnippet のテストスイート', () => {
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

    test('テキストを追加する', () => {
        const snippet = new LatexSnippet(appConfig);
        snippet.appendText('hello');
        assert.strictEqual(snippet.snippet.value, 'hello');
    });

    test('プレースホルダーを追加する', () => {
        const snippet = new LatexSnippet(appConfig);
        snippet.appendPlaceholder('caption');
        assert.strictEqual(snippet.snippet.value, '${1:caption}');
    });

    test('図の配置の選択肢を追加する', () => {
        const snippet = new LatexSnippet(appConfig);
        snippet.appendFigurePlacement();
        assert.strictEqual(snippet.snippet.value, '${1|h,t,b,p,!|}');
    });

    test('図の配置オプションが1つだけの場合は単一の選択肢を追加する', () => {
        appConfig.figurePlacementOptions = ['[H]'];
        const snippet = new LatexSnippet(appConfig);
        snippet.appendFigurePlacement();
        assert.strictEqual(snippet.snippet.value, '[H]');
    });

    test('図の揃え位置の選択肢を追加する', () => {
        appConfig.figureAlignmentOptions = ['centering'];
        const snippet = new LatexSnippet(appConfig);
        snippet.appendFigureAlignment();
        assert.strictEqual(snippet.snippet.value, 'centering');
    });

    test('graphics オプションの選択肢を追加する', () => {
        const snippet = new LatexSnippet(appConfig);
        snippet.appendGraphicsOptions();
        assert.strictEqual(
            snippet.snippet.value,
            '${1|[width=\\\\linewidth],[width=0.8\\\\linewidth]|}',
        );
    });

    test('オプションと引数を伴うコマンドを追加する', () => {
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

    test('内容を環境で囲む', () => {
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

    test('インデントを処理する', () => {
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

    test('パスを POSIX パスに変換する', () => {
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
        assert.strictEqual(snippet.convertToLatexPath('home/test/file.txt'), 'home/test/file.txt');
        assert.strictEqual(
            snippet.convertToLatexPath('../home/test/../file.txt'),
            '../home/file.txt',
        );
    });
});
