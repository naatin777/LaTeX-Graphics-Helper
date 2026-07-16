# タスク: cropPdf.configureのズーム操作とスクロール範囲を改善する

## Status

Done

## 目的

`cropPdf.configure` のPDFプレビューを、トラックパッド操作でも自然に拡大縮小できるようにし、スクロール範囲を左側PDFプレビューだけに限定する。

## 完了条件

- プレビュー上の Ctrl/Cmd + wheel でズームできる
- ズーム範囲を 25%〜400% に広げる
- 通常スクロールは左側PDFプレビューだけで発生する
- 右側設定パネルと画面全体はPDFページスクロールに巻き込まれない
- Playwrightで主要な挙動を確認する

## 変更可能なファイル

- `webview/apps/crop_pdf/`
- `test/playwright/`
- `docs/tasks/README.md`
- `docs/tasks/0122-improve-crop-pdf-zoom-and-scroll.md`

## 対象外

- ドラッグによるcrop範囲選択
- ピンチ中心を基準にした高度なscroll位置補正
- Host側crop処理の変更
- PNG preview生成

## 関連

- [PDF configure crop仕様](../specs/internal/crop-pdf-configure.md)
- [0121: cropPdf.configure GUIのレイアウトを左右分割へ改善する](0121-improve-crop-pdf-configure-layout.md)

## 確認方法

- `CI=true pnpm run check:all`
- `CI=true pnpm run test:playwright -- -g "crop_pdf"`

## 実施内容

- プレビュー上の Ctrl/Cmd + wheel でズームできるようにした
- トラックパッドのpinch操作で発生するmodified wheelをズームとして扱うようにした
- ズーム範囲を 25%〜400% に広げた
- `html` / `body` / `#root` / `.app` のスクロールを止め、PDFページのスクロールを左側プレビューへ閉じ込めた
- 左側プレビューに `overscroll-behavior: contain` を指定し、スクロール連鎖を抑えた
- Playwrightでwheel zoom、zoom clamp、左側プレビューだけがスクロールすることを確認した

## 確認結果

- `./node_modules/.bin/tsc --noEmit -p webview/tsconfig.json`
- `./node_modules/.bin/tsc --noEmit -p webview/tsconfig.test.json`
- `./node_modules/.bin/oxfmt --check src test webview/apps webview/shared webview/vite.config.ts webview/vitest.config.ts package.json tsconfig.json tsconfig.test.json webview/tsconfig.json webview/tsconfig.test.json oxfmt.config.ts oxlint.config.ts`
- `./node_modules/.bin/oxlint src test webview/apps webview/shared webview/vite.config.ts webview/vitest.config.ts oxlint.config.ts`
- `./node_modules/.bin/tsc -p tsconfig.json`
- `./node_modules/.bin/vite build --config webview/apps/crop_pdf/vite.config.ts`
- `./node_modules/.bin/vite build --config webview/apps/merge_pdf/vite.config.ts`
- `CI=true ./node_modules/.bin/playwright test -- -g "crop_pdf"`

ローカルの通常 `pnpm` が `11.7.0` で、プロジェクト要求の `>=11.8.0` と合わなかったため、検証は `node_modules/.bin` の実体を直接呼んで行った。
