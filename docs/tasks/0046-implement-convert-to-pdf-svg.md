# タスク: SVGをPDFに変換する

## Status

Done

## 目的

`latex-graphics-helper.convertToPdf`でSVGをPDFへ変換できるようにする。

## 背景

0045でSVGからPDFへの変換期待値をテストとして追加した。

当初は`rsvg-convert`を使う想定だったが、Windows利用者に外部コマンド導入を求める負担が大きいため、`puppeteer-core`を追加し、Puppeteerで検出できるローカルChrome系ブラウザを利用する経路も用意する。

## 完了条件

- `convertToPdf`でSVGをPDFへ変換できる
- SVGの`width`/`height`または`viewBox`から決めたサイズをPDFページサイズに反映する
- PNG/JPEG/WebP/AVIFとSVGを混在選択してPDFへ変換できる
- SVG→PDFの変換方式を設定で選べる
- Puppeteerで使うブラウザを設定で選べる
- 0045で追加した失敗テストが通る

## 変更可能なファイル

- `src/`
- `package.json`
- `pnpm-lock.yaml`
- `package.nls.json`
- `package.nls.ja.json`
- `docs/specs/internal/output-format-conversion.md`
- `docs/tasks/README.md`
- `docs/tasks/0046-implement-convert-to-pdf-svg.md`
- `docs/research/`

## 対象外

- Draw.ioからPDFへの変換
- SVGからPNG/JPEG/WebP/AVIFへの変換
- 画像を1つのPDFへ結合する機能
- SVG内の外部参照を完全再現すること

## 関連

- `docs/tasks/0045-add-convert-to-pdf-svg-tests.md`
- `docs/specs/internal/output-format-conversion.md`
- `docs/research/2026-06-27-puppeteer-core-svg-pdf.md`

## 確認方法

- `pnpm run check:all`
- `pnpm run test`
