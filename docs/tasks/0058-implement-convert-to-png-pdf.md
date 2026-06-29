# タスク: PDFをPNGに変換する最小実装を追加する

## Status

Done

## 目的

0056と0057で追加した失敗テストを通すため、`convertToPng` のPDF入力だけを最小実装する。

## 完了条件

- `latex-graphics-helper.convertToPng` をVS Code commandとして登録する
- PDFをPNGへ変換できる
- 1ページPDFの出力ファイル名が `outputPath.convertPdfToPng` の `${page}` を使う
- PDFからPNGへの変換で、出力パス設定に `${page}` がない場合は変換開始前にエラーにする
- Safe Mode / Undo / progress / cancellation の既存方針に沿う

## 変更可能なファイル

- `src/commands/convert_to_png.ts`
- `src/operations/convert_pdf_to_png.ts`
- `src/extension.ts`
- `docs/tasks/0058-implement-convert-to-png-pdf.md`
- `docs/tasks/README.md`

## 対象外

- PDF以外からPNGへの変換
- 複数ページPDF専用の追加テスト
- Draw.io変換の実装
- JPEG/WebP/AVIF/SVG出力の実装

## 関連

- `docs/tasks/0056-add-convert-to-png-pdf-tests.md`
- `docs/tasks/0057-add-page-variable-required-tests.md`
- `docs/specs/output-format-conversion.md`

## 確認方法

- `pnpm run check:test`
- `pnpm run test`
