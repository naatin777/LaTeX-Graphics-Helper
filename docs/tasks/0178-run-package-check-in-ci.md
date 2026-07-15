# タスク: Check workflowでpackage checkを実行する

## Status

Todo

## 目的

GitHub Actionsの`Check` workflowで、`package.json`の標準静的チェックを実行し、ローカルの`pnpm run check`とCIの確認範囲を一致させる。

## 完了条件

- `Check` workflowが`rulesync:check`と`pnpm run check`を実行する
- `format` と `typecheck:webview`がPull RequestのCheckで実行される
- `check:all`やVS Code integration testをCheck workflowへ重複して追加しない
- workflowのCheckが成功する
- 既存のTest workflowと責務が重複しない

## 変更可能なファイル

- `.github/workflows/check.yml`
- `docs/tasks/0178-run-package-check-in-ci.md`
- `docs/tasks/README.md`

## 対象外

- `package.json`のscript変更
- `check:all`の変更
- VS Code integration testやPlaywrightの実行条件変更
- lint / format設定変更

## 関連

- [0177: Check workflowとpackage checkの差分を整理する](0177-align-check-workflow-with-package-check.md)
- [0161: 変更影響に応じたCI scopeを設計する](0161-design-change-based-ci-scope.md)

## 確認方法

- `pnpm run check`
- `pnpm run rulesync:check`
- GitHub ActionsのCheck workflow
- `git diff --check`
