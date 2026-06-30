# タスク: editable Draw.io画像をPDF変換対象にする

## Status

Todo

## 目的

`latex-graphics-helper.convertToPdf`で、Draw.ioの編集情報を含む画像ファイルをPDFへ変換できるようにする。

対象拡張子は以下。

- `.drawio.png`
- `.dio.png`
- `.drawio.svg`
- `.dio.svg`

## 完了条件

- 0053で追加した失敗テストが通る
- editable Draw.io画像は通常のPNG/SVG変換ではなくDraw.io変換として扱う
- `outputPath.convertDrawioToPdf`を使って出力先を決める
- Safe Mode、Undo、progress、cancellationは既存`convertToPdf`の流れに乗せる

## 変更可能なファイル

- `docs/tasks/0054-implement-editable-drawio-image-to-pdf.md`
- `docs/tasks/README.md`
- `package.json`
- `src/commands/convert_png_to_pdf.ts`
- `src/operations/convert_png_to_pdf.ts`
- 必要な最小範囲のtest file

## 対象外

- outputPathテンプレート変数の基準変更
- `.drawio.png` / `.drawio.svg` の中身解析
- Draw.io以外の新しい入力形式追加
- 変換コマンド全体のリファクタリング

## 関連

- `docs/tasks/0053-add-editable-drawio-image-to-pdf-tests.md`
- `docs/specs/output-format-conversion.md`

## 確認方法

- `pnpm run test`
