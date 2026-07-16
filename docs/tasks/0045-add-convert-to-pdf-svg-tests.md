# タスク: SVGをPDFに変換する失敗テストを追加する

## Status

Done

## 目的

`latex-graphics-helper.convertToPdf`でSVGをPDFへ変換できるようにするための失敗テストを追加する。

このタスクではテストだけを追加し、実装は変更しない。

## 背景

`docs/specs/internal/output-format-conversion.md`では、`PDF`出力形式コマンドがPNG、JPEG、WebP、AVIF、SVG、Draw.ioを入力として受け取れる方針になっている。

0044でPNG、JPEG、WebP、AVIFからPDFへの変換は対応した。次はSVGを対象にする。

SVGはサイズ解釈が実装方式に依存しやすいため、このタスクではまず期待するサイズ仕様をテスト内で固定する。

## 完了条件

- `convertToPdf`でSVGをPDFへ変換できることをテストする
- 出力PDFが1ページであることをテストする
- SVGの`width`/`height`または`viewBox`から決めたPDFページサイズをテストする
- PNG/JPEG/WebP/AVIFとSVGを混在選択してPDFへ変換できることをテストする
- テスト追加のみを行い、実装変更は次タスクへ分ける

## 変更可能なファイル

- `test/`
- `docs/tasks/README.md`
- `docs/tasks/0045-add-convert-to-pdf-svg-tests.md`

## 対象外

- `src/`の実装変更
- `package.json`の変更
- Draw.ioからPDFへの変換
- 画像を1つのPDFへ結合する機能
- SVGサイズ仕様の全面設計

## 関連

- `docs/specs/internal/output-format-conversion.md`
- `docs/tasks/0043-add-convert-to-pdf-image-format-tests.md`
- `docs/tasks/0044-implement-convert-to-pdf-image-formats.md`

## 確認方法

- `pnpm run check:test`
- `pnpm run test`
