# タスク: cropPdf.configureのズーム操作の一貫性を改善する

## Status

In Progress

## 目的

`cropPdf.configure` のPDFプレビューで、ホイール操作とボタン操作のズーム感を統一し、カーソル位置を基準にした自然なズームを実装する。

## 完了条件

- ホイール操作を連続しても表示位置が不自然に跳ねない
- カーソル位置を基準にしたズームを実装する
- 拡大縮小時にカーソル位置にあるPDF領域が画面上で同じ位置に来る
- 複数ページレイアウトでも正しく動作する
- Playwrightで主要なズーム挙動を確認する

## 変更可能なファイル

- `webview/apps/crop_pdf/src/App.tsx`
- `test/playwright/`
- `docs/tasks/README.md`
- `docs/tasks/0124-fix-crop-pdf-zoom-inconsistency.md`

## 対象外

- ピンチ操作の高度なジェスチャー対応
- タッチデバイス特有の操作
- PDFページ全体のパン操作（基本スクロールは維持）

## 関連

- [PDF configure crop仕様](../specs/crop-pdf-configure.md)
- [0122: cropPdf.configureのズーム操作とスクロール範囲を改善する](0122-improve-crop-pdf-zoom-and-scroll.md)

## 確認方法

- `CI=true pnpm run check:all`
- `CI=true pnpm run test:playwright -- -g "crop_pdf"`
