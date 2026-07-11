# タスク: Gemini Code Assistのレビュー手順を削除する

## Status

Done

## 目的

Gemini Code Assistのアンインストールに合わせ、今後発生しない自動レビューを待機・再確認する手順をAI作業ルールから削除する。

## 完了条件

- Gemini Code Assist固有のレビュー確認指示を削除する
- 導入されていない自動レビューを待たないと明記する
- 実際に存在するreview commentsへの対応方針は維持する
- RuleSync生成物へ反映する

## 変更可能なファイル

- `.rulesync/rules/overview.md`
- RuleSyncが生成するAIルールファイル
- `docs/tasks/README.md`
- `docs/tasks/0137-remove-gemini-code-assist-review-workflow.md`

## 対象外

- 通常のPR review comment対応方針の削除
- GitHub ActionsやGitHub App設定の変更
- 新しい自動レビューツールの導入

## 確認方法

- `pnpm run rulesync:generate`
- `pnpm run rulesync:check`
- `rg -i "Gemini|Code Assist" .rulesync AGENTS.md CLAUDE.md .cursor .github`
