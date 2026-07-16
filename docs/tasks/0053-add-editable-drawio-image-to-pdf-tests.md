# タスク: editable Draw.io画像をPDF変換対象にする失敗テストを追加する

## Status

Done

## 目的

`latex-graphics-helper.convertToPdf`で、Draw.ioの編集情報を含む画像ファイルをPDF変換対象として扱うための失敗テストを追加する。

対象拡張子は以下。

- `.drawio.png`
- `.dio.png`
- `.drawio.svg`
- `.dio.svg`

## 完了条件

- `package.json`の変換メニュー条件に、editable Draw.io画像が含まれることをテストする
- `latex-graphics-helper.convertToPdf`がeditable Draw.io画像をunsupported inputとして拒否しないことをテストする
- このタスクでは失敗テスト追加に留め、実装変更は行わない

## 変更可能なファイル

- `docs/tasks/0053-add-editable-drawio-image-to-pdf-tests.md`
- `docs/tasks/README.md`
- `test/package_manifest.test.ts`
- `test/convert_to_pdf_command.test.ts`

## 対象外

- editable Draw.io画像をPDFへ変換する実装
- Draw.io CLIの呼び出し実装
- outputPathテンプレート変数の基準変更
- `.drawio.png` / `.drawio.svg` の中身解析

## 関連

- `docs/specs/internal/output-format-conversion.md`
- `docs/tasks/0048-track-unimplemented-work.md`

## 確認方法

- `pnpm run test`
