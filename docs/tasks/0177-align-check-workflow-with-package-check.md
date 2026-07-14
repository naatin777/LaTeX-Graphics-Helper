# タスク: Check workflowとpackage checkの差分を整理する

## Status

Todo

## 目的

GitHub Actionsの `Check` workflowと `package.json` の `check` scriptの差分が意図的かどうかを確認し、CIで確認すべき項目を整理する。

## 背景

0172のCI baseline測定で、現在の `Check` workflowは `rulesync:check`、`lint`、`typecheck` を個別実行している一方、`package.json` の `check` は `lint`、`format`、`typecheck`、`typecheck:webview` を含むことが分かった。

## 完了条件

- `Check` workflowと `package.json` の `check` / `check:all` の差分を表にしている
- `format` と `typecheck:webview` をCIで実行しない理由があるか確認している
- 変更が必要な場合、workflow変更タスクを別に切っている
- このタスクではworkflowを変更していない

## 変更可能なファイル

- `docs/tasks/0177-align-check-workflow-with-package-check.md`
- `docs/tasks/README.md`

## 対象外

- workflow変更
- package script変更
- lint / format設定変更

## 関連

- [0172: CI scope設計の現状baselineを測定する](0172-measure-ci-scope-baseline.md)

## 確認方法

- `.github/workflows/check.yml` と `package.json` を読む
- `git diff --check`
