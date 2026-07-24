import assert from 'node:assert/strict';

import { assertPageTemplateForSplitOutput, formatOutputPage } from '../../src/config/output/page_template.js';

suite('分割出力のpageテンプレート', () => {
  test('総数の桁数で1始まりのpageを0埋めする', () => {
    assert.strictEqual(formatOutputPage(1, 9), '1');
    assert.strictEqual(formatOutputPage(1, 12), '01');
    assert.strictEqual(formatOutputPage(12, 125), '012');
  });

  test('複数ページの分割出力にはpage変数を要求する', () => {
    assert.throws(() => assertPageTemplateForSplitOutput('${fileDirname}/image.png', 2), /requires \$\{page\}/);
    assert.doesNotThrow(() => assertPageTemplateForSplitOutput('${fileDirname}/image-${page}.png', 2));
    assert.doesNotThrow(() => assertPageTemplateForSplitOutput('${fileDirname}/image.png', 1));
  });
});
