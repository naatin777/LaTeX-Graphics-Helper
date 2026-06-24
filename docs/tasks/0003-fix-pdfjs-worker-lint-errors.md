# タスク: lintのPDF.js worker importエラーを解消する

## Status

Done

## 目的

`pnpm run check` のlint段階で発生する、PDF.js workerのdefault importエラー2件を解消する。

## 完了条件

- crop PDF側のPDF.js worker importがlintエラーにならない
- merge PDF側のPDF.js worker importがlintエラーにならない
- `pnpm run check` を再実行し、次に失敗する箇所または成功結果を確認している
- このタスクと無関係なlint警告を修正していない

## 変更可能なファイル

- `webview/apps/crop_pdf/src/pdf/pdfjs.ts`
- `webview/apps/merge_pdf/src/pdf/pdfjs.ts`
- import型定義に変更が必要な場合は、実装前に対象ファイルと理由を確認する
- `docs/tasks/README.md`
- `docs/tasks/0003-fix-pdfjs-worker-lint-errors.md`
- 検証で新たな問題が見つかった場合に作成する `docs/tasks/*.md`

## 対象外

- lint警告の解消
- formatまたはtypecheckで見つかる別問題の修正
- PDF.jsや依存パッケージの更新
- PDF処理の仕様変更

## 関連

- `docs/tasks/0002-establish-validation-baseline.md`
- `docs/adr/0005-limit-codex-change-scope.md`

## 確認方法

- `pnpm run check`

## 実行結果

実行日: 2026-06-21

### 変更

- crop PDF側の `?url` worker importを削除した
- merge PDF側の `?url` worker importを削除した
- Vite設定が出力先へコピーする `pdf.worker.mjs` を、PDF.jsのworker URLとして直接指定した

### 確認

`pnpm run check` は成功した。

- lint: エラーなし、既存警告10件
- format: 成功
- extension typecheck: 成功
- webview typecheck: 成功

既存のlint警告はこのタスクの対象外のため変更していない。
