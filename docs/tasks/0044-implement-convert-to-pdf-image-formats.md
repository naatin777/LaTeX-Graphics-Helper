# タスク: JPEG/WebP/AVIFをPDFに変換する

## Status

Done

## 目的

`latex-graphics-helper.convertToPdf`で、PNGに加えてJPEG、WebP、AVIFをPDFへ変換できるようにする。

0043で追加した失敗テストを通すための最小実装だけを行う。

## 背景

`convertToPdf`は出力形式基準のコマンドだが、現状はPNG入力だけを受け付けている。

JPEG、WebP、AVIFはsharpで読み取ってPNGに正規化してPDFへ埋め込めるため、既存のPNG→PDF実装を小さく拡張する。

## 完了条件

- `convertToPdf`でPNG、JPEG、WebP、AVIFを受け付ける
- JPEG、WebP、AVIFから生成したPDFが1ページになる
- 生成PDFのページサイズが入力画像のpixel幅・高さと同じ数値のpointになる
- 非対応入力が含まれる場合は、これまで通り変換全体を開始しない
- `convertPngToPdf`互換commandはPNGのみを受け付ける
- SVG、Draw.ioからPDFへの変換は対象外のままにする

## 変更可能なファイル

- `src/commands/convert_png_to_pdf.ts`
- `src/operations/convert_png_to_pdf.ts`
- `package.json`
- `docs/tasks/README.md`
- `docs/tasks/0044-implement-convert-to-pdf-image-formats.md`

## 対象外

- SVGからPDFへの変換
- Draw.ioからPDFへの変換
- 画像を1つのPDFへ結合する機能
- 出力パス設定の再設計
- 変換処理の大規模リファクタ

## 関連

- `docs/specs/internal/output-format-conversion.md`
- `docs/tasks/0043-add-convert-to-pdf-image-format-tests.md`

## 確認方法

- `pnpm run check:all`
- `pnpm run test`
