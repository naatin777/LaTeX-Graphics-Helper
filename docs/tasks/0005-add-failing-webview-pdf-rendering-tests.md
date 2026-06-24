# タスク: WebviewのPDF表示テストを先行追加する

## Status

Done

## 目的

`crop_pdf` と `merge_pdf` のWebviewが、Hostから渡されたローカルPDFのURLをPDF.jsで読み込み、最初のページを表示することを期待するPlaywrightテストを先行して追加する。

現時点ではPDF表示が未実装であるため、テストが意図した理由で失敗することを確認する。

## 完了条件

- crop PDF WebviewのPDF表示テストがある
- merge PDF WebviewのPDF表示テストがある
- Hostからのメッセージ形式が `{ type: "init", payload: { pdfSrc: string } }` になっている
- ローカルPDFをHTTP経由で配信し、そのURLを `pdfSrc` として渡している
- 最初のページがcanvasへ描画されたことを検証している
- 現在の実装でテストが意図した理由により失敗することを確認している
- PDF表示機能そのものは実装していない

## 変更可能なファイル

- `src/test/playwright/`
- `docs/tasks/README.md`
- `docs/tasks/0005-add-failing-webview-pdf-rendering-tests.md`

## 対象外

- WebviewへのPDF表示機能の実装
- Host側の `asWebviewUri` 変換処理の実装
- cropまたはmerge機能の実装
- 依存関係の追加または更新

## 関連

- `docs/specs/product.md`
- `docs/adr/0005-limit-codex-change-scope.md`
- `docs/tasks/0003-fix-pdfjs-worker-lint-errors.md`

## 確認方法

- `pnpm run test:playwright`
- `pnpm run check`

## テスト仕様

- Hostは `inputUri` を `webview.asWebviewUri(inputUri)` で変換する
- Hostは変換後のURLを `{ type: "init", payload: { pdfSrc } }` としてWebviewへ送る
- Webviewは `pdfSrc` をPDF.jsへ渡してPDFを取得する
- WebviewはPDFの最初のページをcanvasへ描画する

## 実行結果

実行日: 2026-06-21

### `pnpm run check`

結果: 成功

- lint: エラーなし、既存警告10件
- format: 成功
- extension typecheck: 成功
- webview typecheck: 成功

### `pnpm run test:playwright`

結果: 期待どおり失敗

- `crop_pdf renders the first PDF page`: 失敗
- `merge_pdf renders the first PDF page`: 失敗

両テストとも、`init` メッセージ送信後に `canvas[data-pdf-page="1"]` が見つからず失敗した。

これは現在のWebviewにPDF表示処理が未実装であることと一致する。

テスト実行前に、ローカル環境へPlaywright用Chromiumをインストールした。依存関係やリポジトリ内の設定は変更していない。

対応タスク:

- `0006-render-first-pdf-page-in-webviews.md`
