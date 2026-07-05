# タスク: cropPdf.configure GUIのレイアウトを左右分割へ改善する

## Status

Done

## 目的

`cropPdf.configure` のWebviewを、PDFプレビューと設定フォームが混ざった縦積み画面から、左にPDFページ一覧、右にcrop設定を置く操作しやすいレイアウトへ改善する。

## 完了条件

- 左側にPDFページ一覧を表示する
- 右側にcrop box / target pages / Apply / Cancelをまとめる
- PDFプレビュー上部に拡大縮小操作を置く
- ページ番号はPDFページカードのfooterに表示する
- cropBoxの値はズームしてもPDFポイント基準のまま扱う
- 主要なUI構造をPlaywrightで確認する

## 変更可能なファイル

- `webview/apps/crop_pdf/`
- `webview/shared/pdf/`
- `test/playwright/`
- `docs/tasks/README.md`
- `docs/tasks/0121-improve-crop-pdf-configure-layout.md`

## 対象外

- ドラッグによるcrop範囲選択
- ページごとに異なるcrop範囲
- ページ一覧の仮想スクロール
- Host側crop処理の変更
- PNG preview生成

## 関連

- [PDF configure crop仕様](../specs/crop-pdf-configure.md)
- [0120: cropPdf.configure GUIを実操作できる状態へ仕上げる](0120-finish-crop-pdf-configure-gui.md)

## 確認方法

- `CI=true pnpm run check:all`
- `CI=true pnpm run test:playwright -- -g "crop_pdf"`

## 実施内容

- Webviewを左PDFプレビュー / 右設定パネルの2カラム構成にした
- 狭い画面では1カラムへ落ちるようにした
- PDFプレビュー上部にZoom out / Zoom inと倍率表示を追加した
- 各PDFページを `figure` で包み、ページ番号をfooterへ表示した
- zoomはcanvasのCSS表示サイズだけを変え、cropBoxはPDFポイント基準のまま扱うようにした
- Playwrightでレイアウト、ページfooter、ズーム時のApply payloadを確認した

## 確認結果

- `./node_modules/.bin/oxlint src test webview/apps webview/shared webview/vite.config.ts webview/vitest.config.ts oxlint.config.ts`
- `./node_modules/.bin/oxfmt --check src test webview/apps webview/shared webview/vite.config.ts webview/vitest.config.ts package.json tsconfig.json tsconfig.test.json webview/tsconfig.json webview/tsconfig.test.json oxfmt.config.ts oxlint.config.ts`
- `./node_modules/.bin/tsc --noEmit -p tsconfig.json`
- `./node_modules/.bin/tsc --noEmit -p webview/tsconfig.json`
- `./node_modules/.bin/tsc --noEmit -p tsconfig.test.json`
- `./node_modules/.bin/tsc --noEmit -p webview/tsconfig.test.json`
- `CI=true ./node_modules/.bin/playwright test -- -g "crop_pdf"`

ローカルの通常 `pnpm` が `11.7.0` で、プロジェクト要求の `>=11.8.0` と合わなかったため、検証は `node_modules/.bin` の実体を直接呼んで行った。
