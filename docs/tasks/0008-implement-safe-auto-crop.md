# タスク: cropPdf.autoを安全な作業領域で実装する

## Status

Done

## 目的

`cropPdf.auto` で選択されたPDFを、元ファイルへ直接変更を加えずにGhostscriptで自動クロップする。

処理はworkspace内の `.latex-graphics-helper/` にコピーしたファイルへ行い、全PDFの変換成功後にだけ指定出力先へ完成ファイルを反映する。

## 完了条件

- commandが `uri` と `uris` を受け取り、複数PDFを処理できる
- margin pickerを1回だけ表示し、全PDFへ同じ値を適用する
- margin選択肢を設定でき、既定値が `[0, 5, 10, 20]` である
- 元PDFをworkspaceの `.latex-graphics-helper/crop-pdf/<一意ID>/` へコピーして処理する
- GhostscriptだけでBoundingBox取得、クロップ、複数ページPDFの再構成を行う
- 出力先を元PDF基準の `outputPath.cropPdf` から展開する
- 相対出力パスをworkspace基準で解決する
- 既存出力がある場合は処理開始前にエラーにする
- 全変換成功後にだけ出力先へ完成ファイルを反映する
- 出力反映に失敗した場合、今回反映済みの出力を削除する
- `.latex-graphics-helper/` の作業ファイルを成功後も残す
- 1件失敗したら全体を停止する
- `pnpm run check` と関連テストが成功する

## 変更可能なファイル

- `src/extension.ts`
- `src/commands/`
- `src/operations/`
- `src/config/`
- `test/`
- `package.json`
- `package.nls.json`
- `package.nls.ja.json`
- `docs/specs/`
- `docs/adr/`
- `docs/tasks/README.md`
- `docs/tasks/0008-implement-safe-auto-crop.md`

## 対象外

- safe modeとstatus barの実装
- 既存出力を上書きする動作
- `WorkspaceEdit` によるUndo対応
- `.latex-graphics-helper/` の自動削除
- `cropPdf.manual` の実装
- Ghostscript以外のクロップツール対応

## 関連

- `docs/specs/product.md`
- `docs/adr/0005-limit-codex-change-scope.md`
- `docs/adr/0006-use-workspace-staging-for-file-operations.md`

## 確認方法

- `pnpm run check`
- `pnpm run test`

## 実行結果

実行日: 2026-06-21

### 変更

- `cropPdf.auto` commandへ複数PDF対応の処理を接続した
- margin pickerを追加し、設定可能な既定選択肢を `[0, 5, 10, 20]` とした
- 元PDF基準の出力パステンプレート展開を追加した
- 相対出力パスをworkspace基準で解決するようにした
- workspace内の `.latex-graphics-helper/crop-pdf/<一意ID>/` へPDFをコピーして処理するようにした
- GhostscriptでBoundingBoxとMediaBoxを取得し、ページごとのクロップと再構成を行うようにした
- 全変換成功後にだけ出力を反映し、反映途中の失敗時は今回作成した出力を削除するようにした
- 既存出力と出力先重複を処理開始前に拒否するようにした

### `pnpm run check:all`

結果: 成功

### `pnpm run test`

結果: 成功（9件）

- 出力パステンプレート展開: 2件
- 拡張機能の登録と有効化: 2件
- クロップ処理、上書き拒否、出力ロールバック: 3件
- Ghostscript出力の解析: 2件

### 実Ghostscript確認

Ghostscript 10.07.1で2ページPDFを処理し、以下を確認した。

- 出力が2ページのPDFである
- 各ページへ5ptのmarginが追加されている
- `.latex-graphics-helper/` に元PDFコピー、ページ別PDF、完成PDFが残っている

## 仕様変更

`cropPdf.auto` が、元PDFを直接変更せずに複数PDFを自動クロップできるようになった。
