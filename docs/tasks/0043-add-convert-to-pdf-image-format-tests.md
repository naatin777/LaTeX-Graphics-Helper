# タスク: JPEG/WebP/AVIFをPDFに変換する失敗テストを追加する

## Status

Done

## 目的

`latex-graphics-helper.convertToPdf`で、PNG以外の画像形式であるJPEG、WebP、AVIFをPDFへ変換できるようにするための失敗テストを追加する。

このタスクではテストだけを追加し、実装は変更しない。

## 背景

`docs/specs/output-format-conversion.md`では、`PDF`出力形式コマンドがPNG、JPEG、WebP、AVIF、SVG、Draw.ioを入力として受け取れる方針になっている。

現状の`convertToPdf`はPNG入力だけに対応している。まずは既存のsharp/pdf-lib実装に近いJPEG、WebP、AVIFを対象にする。

## 完了条件

- `convertToPdf`でJPEGをPDFに変換できることをテストする
- `convertToPdf`でWebPをPDFに変換できることをテストする
- `convertToPdf`でAVIFをPDFに変換できることをテストする
- 出力PDFが1ページであることをテストする
- 出力PDFのページサイズが入力画像のpixel幅・高さと同じ数値のpointになることをテストする
- テスト追加のみを行い、実装変更は次タスクへ分ける

## 変更可能なファイル

- `test/`
- `docs/tasks/README.md`
- `docs/tasks/0043-add-convert-to-pdf-image-format-tests.md`

## 対象外

- `src/`の実装変更
- `package.json`の変更
- SVGからPDFへの変換
- Draw.ioからPDFへの変換
- 画像を1つのPDFへ結合する機能

## 関連

- `docs/specs/output-format-conversion.md`
- `docs/tasks/0034-add-convert-to-pdf-output-format-tests.md`
- `docs/tasks/0035-implement-convert-to-pdf-output-format-command.md`

## 確認方法

- `pnpm run check:test`
- `pnpm run test`
