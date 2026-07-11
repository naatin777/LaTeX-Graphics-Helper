# タスク: 複雑なUnicodeファイル名のcrop出力テストを追加する

## Status

Done

## 目的

`cropPdf.configure`が、複数言語の文字・絵文字・半角空白・全角空白・全角英数字・記号を混在させたファイル名を正規化せず、`outputPath`へそのまま展開できることをテストする。

## 完了条件

- 固定PDF fixtureを複雑なUnicodeファイル名で一時workspaceへコピーする
- 先頭の半角空白と、ファイル名中の半角空白・全角空白を保持する
- 日本語・英語・韓国語・中国語・アラビア語・ヒンディー語・タイ語・ヘブライ語・ギリシャ語・ロシア語を同じファイル名に含める
- 絵文字・全角英数字・Unicode記号も同じファイル名に含める
- 複数の`outputPath`テンプレートを実際のcrop出力まで検証する
- production codeを変更しない

## 変更可能なファイル

- `test/crop_pdf_configure_operation.test.ts`
- `test/helpers/crop_configure_fixture.ts`
- `test/fixtures/pdf-operations/user-files/README.md`
- `docs/test-matrix.md`
- `docs/tasks/README.md`
- `docs/tasks/0130-add-complex-unicode-output-path-tests.md`

## 対象外

- OSで使用禁止のパス文字を許可すること
- Unicode normalization方式の変更
- `resolveOutputPath`の実装変更

## 関連

- [0123: cropPdf.configureの操作テストを追加する](0123-add-crop-pdf-configure-operation-tests.md)
- [PDF configure crop仕様](../specs/crop-pdf-configure.md)

## 確認方法

- `CI=true pnpm run check:all`
- `CI=true pnpm run test:vscode`
