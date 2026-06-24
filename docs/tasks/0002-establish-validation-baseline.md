# タスク: 検証ベースラインを確立する

## Status

Done

## 目的

`pnpm run check` と `pnpm run test` の現在の実行結果を記録し、今後の変更を確認するための基準を作る。

## 完了条件

- `pnpm run check` を実行して結果を記録している
- `pnpm run test` を実行して結果を記録している
- 失敗がある場合は、このタスク内で修正せず、問題ごとに別タスクとして記録している
- 完了後に `Status` が `Done` になっている

## 変更可能なファイル

- `docs/tasks/README.md`
- `docs/tasks/0002-establish-validation-baseline.md`
- 失敗ごとに作成する `docs/tasks/*.md`

## 対象外

- checkまたはtestで見つかった問題の修正
- ソースコード、設定、依存関係の変更
- 定義されていない検証コマンドを推測して実行すること

## 関連

- `AGENTS.md`
- `PROJECT_STATE.md`
- `docs/adr/0004-manage-tasks-with-markdown.md`
- `docs/adr/0005-limit-codex-change-scope.md`

## 確認方法

- `pnpm run check`
- `pnpm run test`

## 実行結果

実行日: 2026-06-21

### `pnpm run check`

結果: 失敗（exit code 1）

`check` は最初の `lint` で停止したため、`format`、`typecheck`、`typecheck:webview` は実行されていない。

エラー:

- `webview/apps/crop_pdf/src/pdf/pdfjs.ts:2`
  - `pdfjs-dist/build/pdf.worker.mjs?url` にdefault exportがないとして、default importがlintエラーになった
- `webview/apps/merge_pdf/src/pdf/pdfjs.ts:2`
  - 同じdefault importがlintエラーになった

警告:

- `main.tsx` の未代入import: 2件
- `cancel` のスコープ: 2件
- `postMessage` の `targetOrigin` 不足: 4件
- `console` の使用: 2件

対応タスク:

- `0003-fix-pdfjs-worker-lint-errors.md`

### `pnpm run test`

結果: 失敗（exit code 1）

`package.json` に `test` スクリプトが定義されていないため、テストは実行されていない。

pnpmからは `test:all` が候補として表示されたが、このタスクでは代わりのコマンドを推測して実行していない。

対応タスク:

- `0004-decide-standard-test-command.md`
