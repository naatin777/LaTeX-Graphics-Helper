# タスク: RuleSync ruleを責務別に分割する

## Status

Done

## 目的

長くなった`.rulesync/rules/overview.md`を責務別のrule fileへ分割し、AIが必要なルールを把握しやすくする。

## 完了条件

- 作業範囲、test、documentation、Git / PR、自動修正の責務が分かれている
- 分割前のruleの意味が欠落していない
- 同じruleを複数fileへ重複させていない
- RuleSyncの全targetで生成結果を確認している
- 移行中は既存の`overview.md`を正本として残し、同期確認後に切り替えている
- rule内容の追加、削除、方針変更を混ぜていない

## 変更可能なファイル

- `.rulesync/rules/`
- RuleSyncが生成するAI向けrule file
- `docs/tasks/0158-split-rulesync-rules-by-responsibility.md`
- `docs/tasks/README.md`

## 対象外

- 新しいAI運用ルールの追加
- task用skill、hook、worktreeの変更
- application、test、CI、dependencyの変更

## 関連

- [ADR-0001: AI向け作業ルールをRuleSyncで管理しAGENTS.mdへ生成する](../adr/0001-use-agents-md-for-codex-rules.md)
- [ADR-0014: AI開発ハーネスの責務と導入順を定義する](../adr/0014-define-ai-development-harness.md)
- [0163: RuleSync生成物の同期をCIで検証する](0163-verify-rulesync-generated-files-in-ci.md)

## 確認方法

- `pnpm run rulesync:generate`
- `pnpm run rulesync:check`
- 分割前後の生成物に含まれる見出しとruleを比較する
- `git diff --check`
