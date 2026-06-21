# タスク: WebviewのPDF表示内容検証を強化する

## Status

Done

## 目的

WebviewのPDF表示テストを、canvasの存在や空でない画素だけでなく、既知のPDF内容が正しい位置と色で描画されたことまで検証できるようにする。

## 完了条件

- テストPDFに判別可能な色配置がある
- canvasの幅と高さが0より大きいことを検証している
- canvasの複数位置で期待する色を検証している
- URL受信だけ、空canvas、別内容、上下左右が逆の描画では成功しない
- `crop_pdf` と `merge_pdf` の両方に同じ内容検証を適用している
- 現在の実装では、canvasが存在しないため期待どおり失敗する
- PDF表示機能そのものは実装していない

## 変更可能なファイル

- `src/test/playwright/webview-pdf-rendering.spec.ts`
- `docs/tasks/README.md`
- `docs/tasks/0007-strengthen-webview-pdf-rendering-tests.md`

## 対象外

- WebviewへのPDF表示機能の実装
- スクリーンショットの見た目全体を固定すること
- UIデザインの検証
- 依存関係の追加または更新

## 関連

- `docs/tasks/0005-add-failing-webview-pdf-rendering-tests.md`
- `docs/tasks/0006-render-first-pdf-page-in-webviews.md`

## 確認方法

- `pnpm run check`
- `pnpm run test:playwright`

## 実行結果

実行日: 2026-06-21

### 追加した内容検証

テストPDFの最初のページを4象限に分け、以下の色で塗り分けた。

- 左上: 赤
- 右上: 緑
- 左下: 青
- 右下: 黄

テストではcanvasの表示とサイズに加え、各象限の中央画素が期待するRGBA値であることを検証する。

これにより、以下の場合は成功しない。

- `pdfSrc` を受け取っただけ
- 空のcanvasを作成しただけ
- PDFとは異なる内容を描画した
- 上下または左右を逆に描画した
- 一部の象限しか描画していない

### `pnpm run check`

結果: 成功

- lint: エラーなし、既存警告10件
- format: 成功
- extension typecheck: 成功
- webview typecheck: 成功

### `pnpm run test:playwright`

結果: 期待どおり失敗

- `crop_pdf renders the first PDF page`: canvasが存在しないため失敗
- `merge_pdf renders the first PDF page`: canvasが存在しないため失敗

PDF表示実装後は、canvasの存在確認を通過したうえで4象限の色検証が実行される。
