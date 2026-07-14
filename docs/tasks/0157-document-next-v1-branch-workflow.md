# タスク: next/v1のbranch・PR運用をRuleSyncへ記録する

## Status

Todo

## 目的

`next/v1`へ直接pushせず、task branchからPRで統合する現在の運用を、会話上の注意ではなく全AIツールが読む共通ruleへ記録する。

## 完了条件

- 最新の`next/v1`からtask branchを作ることを明記している
- `next/v1`へ直接commit・pushしないことを明記している
- task branchのPR targetを`next/v1`とすることを明記している
- `next/v1`からmainへのPRはユーザーの明示依頼まで作らないことを明記している
- Conventional Commitsと英語PR titleの既存方針を維持している
- RuleSyncの正本と生成物が同期している
- rule分割やskill追加を混ぜていない

## 変更可能なファイル

- `.rulesync/rules/overview.md`
- RuleSyncが生成するAI向けrule file
- `docs/tasks/0157-document-next-v1-branch-workflow.md`
- `docs/tasks/README.md`

## 対象外

- RuleSync ruleの分割・短縮
- skill、hook、worktreeの追加
- branchの作成、push、PR作成の自動化
- `next/v1`からmainへのPR作成
- application、test、CIの変更

## 関連

- [ADR-0014: AI開発ハーネスの責務と導入順を定義する](../adr/0014-define-ai-development-harness.md)

## 確認方法

- `pnpm run rulesync:generate`
- `pnpm run rulesync:check`
- `git diff --check`
