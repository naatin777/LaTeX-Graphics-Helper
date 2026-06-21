# タスク: WebviewにPDFの最初のページを表示する

## Status

Done

## 目的

`crop_pdf` と `merge_pdf` のWebviewで、Hostから受け取った `pdfSrc` をPDF.jsへ渡し、PDFの最初のページをcanvasへ描画する。

## 完了条件

- 両Webviewが `{ type: "init", payload: { pdfSrc: string } }` を受信できる
- 両Webviewが `pdfSrc` をPDF.jsへ渡してPDFを取得する
- 両Webviewが最初のページを `canvas[data-pdf-page="1"]` へ描画する
- テストPDFの赤・緑・青・黄の4象限が正しい位置と色で描画される
- `pnpm run test:playwright` のPDF表示テスト2件が成功する
- `pnpm run check` が成功する

## 変更可能なファイル

- `webview/apps/crop_pdf/src/App.tsx`
- `webview/apps/crop_pdf/src/messages.ts`
- `webview/apps/crop_pdf/src/styles.css`
- `webview/apps/merge_pdf/src/App.tsx`
- `webview/apps/merge_pdf/src/messages.ts`
- `webview/apps/merge_pdf/src/styles.css`
- `webview/shared/pdf/render_first_page.ts`
- `src/test/playwright/webview-pdf-rendering.spec.ts`
- `docs/tasks/README.md`
- `docs/tasks/0006-render-first-pdf-page-in-webviews.md`

## 対象外

- Host側のWebview起動処理の実装
- PDFの2ページ目以降の表示
- cropまたはmerge操作の実装
- PDF.jsや依存パッケージの更新
- UIデザインの大規模な変更

## 関連

- `docs/tasks/0005-add-failing-webview-pdf-rendering-tests.md`
- `docs/specs/product.md`

## 確認方法

- `pnpm run test:playwright`
- `pnpm run check`

## 実行結果

実行日: 2026-06-21

### 変更

- `crop_pdf` と `merge_pdf` にPDF表示用canvasを追加した
- 両Webviewで `{ type: "init", payload: { pdfSrc } }` を受信するようにした
- `pdfSrc` をPDF.jsへ渡し、最初のページをcanvasへ描画する共通処理を追加した
- canvasをWebview幅に収める最小限のスタイルを追加した
- Playwrightの画素検証を、PDF.jsの非同期描画完了まで待つようにした

### `pnpm run check`

結果: 成功

- lint: エラーなし、既存警告10件
- format: 成功
- extension typecheck: 成功
- webview typecheck: 成功

### `pnpm run test:playwright`

結果: 成功

- `crop_pdf renders the first PDF page`: 成功
- `merge_pdf renders the first PDF page`: 成功

両テストで、テストPDFの4象限が以下の色と位置で描画されたことを画素値で確認した。

- 左上: 赤
- 右上: 緑
- 左下: 青
- 右下: 黄

## 仕様変更

Hostから `init` メッセージで渡された `pdfSrc` のPDFについて、両Webviewが最初のページを表示するようになった。
