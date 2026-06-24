# タスク: RuleSyncのStop hookでlint/format自動修正を実行する

## Status

Done

## 目的

AIツールのStop時に、既存の自動修正commandをhookから実行できるようにする。

## 完了条件

- RuleSyncのhooks featureが有効になっている
- Stop hookで既存の`pnpm run check:fix`を実行する
- RuleSyncの生成物が同期している
- hook追加以外の実装コードを変更していない

## 変更可能なファイル

- `rulesync.jsonc`
- `.rulesync/hooks.json`
- `.rulesync/hooks/`
- RuleSyncが生成する各AIツール向けhook file
- `docs/tasks/README.md`
- `docs/tasks/0037-add-rulesync-stop-fix-hook.md`
- `docs/research/rulesync.md`

## 対象外

- lint/format script自体の変更
- 既存実装コードの変更
- pre-commit hookやCI設定の変更

## 関連

- `docs/adr/0001-use-agents-md-for-codex-rules.md`
- `docs/research/rulesync.md`

## 確認方法

- `pnpm run rulesync:generate`
- `pnpm run rulesync:check`
