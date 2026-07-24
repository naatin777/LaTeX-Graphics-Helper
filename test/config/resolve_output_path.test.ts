import assert from 'node:assert/strict';
import path from 'node:path';

import { logicalSourcePathForOutputTemplate } from '../../src/application/policy/source_format.js';
import { resolveOutputPath, type OutputPathContext } from '../../src/config/output/resolve_output_path.js';

type OutputPathPlatform = 'win32' | 'posix';
type ResolveOutputPathWithPlatform = (
  templatePath: string,
  context: OutputPathContext,
  options: { platform: OutputPathPlatform; allowedExtensions?: readonly string[] },
) => string;

// Implementation Phaseで追加するplatform注入契約を、失敗テスト段階でも型安全に呼び出す。
const resolveOutputPathWithPlatform = resolveOutputPath as ResolveOutputPathWithPlatform;

suite('出力パスのテンプレート解決', () => {
  test('元PDFパスからsource系変数を展開する', () => {
    const workspacePath = path.resolve(path.sep, 'workspace');
    const sourcePath = path.join(workspacePath, 'figures', 'sample.pdf');

    const result = resolveOutputPath('${fileDirname}/${fileBasenameNoExtension}-crop${fileExtname}', {
      workspacePath,
      workspaceName: 'workspace',
      sourcePath,
      dateNow: 123,
    });

    assert.strictEqual(result, path.join(workspacePath, 'figures', 'sample-crop.pdf'));
  });

  test('相対出力パスをworkspace基準で解決する', () => {
    const workspacePath = path.resolve(path.sep, 'workspace');
    const sourcePath = path.join(workspacePath, 'figures', 'sample.pdf');

    const result = resolveOutputPath('generated/${relativeFileDirname}/${fileBasename}', {
      workspacePath,
      workspaceName: 'workspace',
      sourcePath,
    });

    assert.strictEqual(result, path.join(workspacePath, 'generated', 'figures', 'sample.pdf'));
  });

  test('ファイル名に含まれるテンプレート構文は再展開しない', () => {
    const workspacePath = path.resolve(path.sep, 'workspace');
    const sourcePath = path.join(workspacePath, 'figures', '${fileExtname}.pdf');

    const result = resolveOutputPath('${fileBasenameNoExtension}-crop${fileExtname}', {
      workspacePath,
      workspaceName: 'workspace',
      sourcePath,
    });

    assert.strictEqual(result, path.join(workspacePath, '${fileExtname}-crop.pdf'));
  });

  test('未対応のテンプレート変数を拒否する', () => {
    const workspacePath = path.resolve(path.sep, 'workspace');

    assert.throws(
      () =>
        resolveOutputPath('${unknown}/result.pdf', {
          workspacePath,
          workspaceName: 'workspace',
          sourcePath: path.join(workspacePath, 'sample.pdf'),
        }),
      /Unsupported output path variable/,
    );
  });

  test('Windowsで禁止される文字をpath componentに含む場合は拒否する', () => {
    for (const character of ['<', '>', ':', '"', '|', '?', '*']) {
      assert.throws(
        () =>
          resolveOutputPathWithPlatform(`output/result${character}.pdf`, windowsContext(), {
            platform: 'win32',
          }),
        /Invalid output path for Windows:.*reserved character/,
      );
    }
  });

  test('WindowsでNULと制御文字を拒否する', () => {
    for (const character of ['\u0000', '\u0001', '\u001f']) {
      assert.throws(
        () =>
          resolveOutputPathWithPlatform(`output/result${character}.pdf`, windowsContext(), {
            platform: 'win32',
          }),
        /Invalid output path for Windows:.*control character|NUL/,
      );
    }
  });

  test('Windowsの予約デバイス名を拡張子と大文字小文字に関係なく拒否する', () => {
    for (const fileName of ['CON', 'con.pdf', 'NUL.tar.gz', 'COM1.pdf', 'com¹.log', 'LPT9.pdf', 'lpt³.txt']) {
      assert.throws(
        () =>
          resolveOutputPathWithPlatform(`output/${fileName}`, windowsContext(), {
            platform: 'win32',
          }),
        /Invalid output path for Windows:.*reserved name/,
      );
    }
  });

  test('Windowsで先頭末尾の半角空白と末尾ピリオドを拒否する', () => {
    const cases = [
      { template: 'output/ result.pdf', reason: /leading ASCII space/ },
      { template: 'output/result.pdf ', reason: /trailing ASCII space/ },
      { template: 'output/result.pdf.', reason: /trailing period/ },
      { template: 'output/folder /result.pdf', reason: /trailing ASCII space/ },
    ];

    for (const { template, reason } of cases) {
      assert.throws(
        () =>
          resolveOutputPathWithPlatform(template, windowsContext(), {
            platform: 'win32',
          }),
        reason,
      );
    }
  });

  test('Windowsのdrive letterとseparatorを許可する', () => {
    const result = resolveOutputPathWithPlatform('${workspaceFolder}\\output\\result.pdf', windowsContext(), {
      platform: 'win32',
    });

    assert.strictEqual(result, 'C:\\workspace\\output\\result.pdf');
  });

  test('Windowsで多言語・絵文字・全角文字・全角空白を保持する', () => {
    const fileName = '　日本語 English 한국어 中文 العربية हिन्दी ไทย עברית Ελληνικά Русский 🌹 ＡＢＣ１２３①.pdf';
    // Intentional literal ${} syntax.
    const result = resolveOutputPathWithPlatform(`${'${workspaceFolder}'}\\output\\${fileName}`, windowsContext(), {
      platform: 'win32',
    });

    assert.strictEqual(result, `C:\\workspace\\output\\${fileName}`);
  });

  test('POSIXではWindows専用の禁止文字と予約名を許可する', () => {
    const result = resolveOutputPathWithPlatform('${workspaceFolder}/output/CON?:*.pdf', posixContext(), {
      platform: 'posix',
    });

    assert.strictEqual(result, '/workspace/output/CON?:*.pdf');
  });

  test('POSIXでもNULを拒否する', () => {
    assert.throws(
      () =>
        resolveOutputPathWithPlatform('output/result\u0000.pdf', posixContext(), {
          platform: 'posix',
        }),
      /Invalid output path for POSIX:.*NUL/,
    );
  });

  test('許容拡張子以外を拒否する', () => {
    assert.throws(
      () => resolveOutputPath('output/result.pdf', posixContext(), { allowedExtensions: ['.png'] }),
      /Invalid output extension.*\.pdf/,
    );
    assert.doesNotThrow(() => resolveOutputPath('output/result.PNG', posixContext(), { allowedExtensions: ['.png'] }));
  });

  test('Draw.io compound source nameを論理名として展開する', () => {
    const result = resolveOutputPathWithPlatform(
      '${fileDirname}/${fileBasenameNoExtension}.png',
      {
        ...posixContext(),
        sourcePath: logicalSourcePathForOutputTemplate('/workspace/figures/diagram.drawio.png'),
      },
      { platform: 'posix', allowedExtensions: ['.png'] },
    );

    assert.strictEqual(result, '/workspace/figures/diagram.png');
  });
});

function windowsContext(): OutputPathContext {
  return {
    workspacePath: 'C:\\workspace',
    workspaceName: 'workspace',
    sourcePath: 'C:\\workspace\\figures\\source.pdf',
  };
}

function posixContext(): OutputPathContext {
  return {
    workspacePath: '/workspace',
    workspaceName: 'workspace',
    sourcePath: '/workspace/figures/source.pdf',
  };
}
