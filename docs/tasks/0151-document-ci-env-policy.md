# タスク: CI環境変数のローカル・CI運用を整理する

## Status

Done

## 目的

ローカル作業で`CI=true`を慣例的に付けることをやめ、CI環境とローカル環境で意図的に再現する条件を明確にする。

## 決めること

- ローカルの通常確認では`CI=true`を付けない
- `pnpm run check:all`、`pnpm run test`、`pnpm run test:vscode`は通常の環境変数で実行する
- PlaywrightのCI専用挙動を手元で再現するときだけ`CI=true pnpm run test:playwright`を使う
- GitHub ActionsではGitHubが設定する`CI`環境変数を利用し、workflowで`CI=true`を重複指定しない
- CI依存の失敗を調査するときは、再現意図をタスクまたは作業メモへ記録する

## 変更対象

- `.rulesync/rules/overview.md`
- RuleSyncが生成するAI向けルールファイル
- `docs/tasks/README.md`
- `docs/tasks/0151-document-ci-env-policy.md`

## 対象外

- Playwright設定の挙動変更
- GitHub Actions workflowの構成変更
- テストrunnerやdependencyの変更
- 既存タスクの確認コマンドの一括書き換え

## 完了条件

- AI向けルールに、ローカル通常実行とCI再現実行の`CI`使い分けが明記されている
- RuleSyncの正本と生成ファイルが同期している
- `docs/tasks/README.md`で0151が完了済みになっている
- `src/`、`test/`、workflowに変更がない

## 確認方法

- `pnpm run rulesync:generate`
- `pnpm run rulesync:check`
- `git diff --check`

## 確認結果

- `pnpm run rulesync:generate` 成功
- `pnpm run rulesync:check` 成功
- `git diff --check` 成功
- `src/`、`test/`、workflowは変更していない
