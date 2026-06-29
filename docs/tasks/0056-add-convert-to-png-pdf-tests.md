# タスク: PDFをPNGに変換する失敗テストを追加する

## Status

Done

## 目的

`convertToPng` の実装前に、PDFをPNGへ変換する最小仕様をテストで固定する。

このタスクでは実装を変更せず、現在未実装であることを示す失敗テストだけを追加する。

## 完了条件

- `latex-graphics-helper.convertToPng` がVS Code commandとして登録されることをテストする
- 1ページPDFをPNGへ変換できることをテストする
- 出力ファイル名が既存設定 `outputPath.convertPdfToPng` の既定値に従うことをテストする
- 出力PNGのpixel幅・高さを検証する
- 実装変更は行わない

## 変更可能なファイル

- `test/convert_to_png_command.test.ts`
- `docs/tasks/0056-add-convert-to-png-pdf-tests.md`
- `docs/tasks/README.md`

## 対象外

- `src/` の実装変更
- `package.json` の変更
- 複数ページPDFの変換
- PDF以外からPNGへの変換
- Safe Mode / Undo / progress / cancellation の追加検証

## 関連

- `docs/specs/output-format-conversion.md`
- `docs/tasks/0055-implement-convert-to-png-output-format-menu.md`

## テスト仕様

PDFからPNGへの初期DPIは、既存実装・設定がまだ存在しないため、このテストでは `72dpi` として固定する。

この場合、PDFページサイズと出力PNGのpixel数は同じ数値になる。

例:

- PDFページ: `120pt x 80pt`
- DPI: `72`
- 出力PNG: `120px x 80px`

## 確認方法

- `pnpm run check:test`
- `pnpm run test`
