# タスク: cropPdf.autoを単純で安全な構成へ変更する

## Status

Done

## 目的

`cropPdf.auto` から、パスをPostScriptコードへ埋め込む処理と、Ghostscriptによるページ分割・再結合を取り除く。

GhostscriptはBoundingBox取得だけに使用し、PDFのページ範囲変更と保存は `pdf-lib` で行う。

出力パステンプレートは元テンプレートを1回だけ解析し、ファイル名に含まれる `${...}` を再解釈しない。

## 完了条件

- 文書を更新してからテストを変更している
- テストを変更してから実装を変更している
- Ghostscriptの実行が各PDFにつきbbox取得1回だけである
- Ghostscriptへ `-c` と `--permit-file-read` を渡していない
- Ghostscriptでページ分割、pdfwrite、再結合を行っていない
- `pdf-lib` で各ページのMediaBoxとCropBoxを変更して保存している
- 空白ページは元のMediaBoxを維持する
- 複数PDFを `p-limit` で制限付き並列処理する
- 出力テンプレートを正規表現1回で展開する
- 置換値に含まれる `${...}` を再度展開しない
- 未対応のテンプレート変数はエラーにする
- 全変換成功後の出力反映とロールバックは維持する
- `pnpm run check:all` と `pnpm run test` が成功する

## 変更可能なファイル

- `docs/specs/auto-crop.md`
- `docs/adr/0006-use-workspace-staging-for-file-operations.md`
- `docs/tasks/README.md`
- `docs/tasks/0011-simplify-auto-crop.md`
- `src/config/resolve_output_path.ts`
- `src/operations/crop_pdf_auto.ts`
- `test/resolve_output_path.test.ts`
- `test/crop_pdf_auto.test.ts`
- `package.json`
- `pnpm-lock.yaml`

## 対象外

- workspace外操作を一律拒否する共通機構
- symlinkを含むworkspace境界検証
- safe mode
- `WorkspaceEdit` 対応
- `cropPdf.manual`

## 関連

- `docs/specs/auto-crop.md`
- `docs/adr/0006-use-workspace-staging-for-file-operations.md`
- `docs/tasks/0008-implement-safe-auto-crop.md`
- `docs/tasks/0009-restrict-file-operations-to-workspace.md`

## 確認方法

- `pnpm run check:all`
- `pnpm run test`
- 実Ghostscriptを使用した複数ページPDFの確認

## 実行結果

実行日: 2026-06-21

### 作業順

1. ADR、仕様、タスクを更新した
2. 新設計を要求するテストへ変更した
3. 旧実装に対して型検査が失敗することを確認した
4. 依存追加と実装変更を行った
5. 全検証を実行した

### 変更

- Ghostscriptの利用をbbox取得1回だけにした
- PostScript `-c`、`--permit-file-read`、pdfwrite処理を削除した
- ページ分割と再結合を削除した
- `pdf-lib` で各ページのMediaBoxとCropBoxを変更し、そのまま保存するようにした
- 空白ページでは元のMediaBoxを維持するようにした
- `p-limit` をruntime dependencyへ追加し、最大2件でPDFを並列処理するようにした
- 出力パステンプレートを正規表現1回で展開するようにした
- ファイル名に含まれる `${...}` を再展開しないようにした
- 未対応のテンプレート変数をエラーにした

### `pnpm run check:all`

結果: 成功

### `pnpm run test`

結果: 成功（12件）

- パステンプレート展開: 4件
- 拡張機能とcommand登録: 3件
- PDFクロップ、空白ページ、並列数、上書き拒否: 4件
- BoundingBox解析: 1件

### 実Ghostscript確認

Ghostscript 10.07.1で2ページPDFを処理し、以下を確認した。

- 出力PDFは2ページのままである
- 各ページのMediaBoxとCropBoxへ5ptのmarginが反映されている
- GhostscriptによるPDF再生成は行われていない
