# タスク: RuleSync生成物の同期をCIで検証する

## Status

Done

## 目的

`rulesync.jsonc`の生成targetとGit管理中の生成物を対応付け、RuleSyncの正本を変更したPRで生成忘れをCIから検出できるようにする。

## 完了条件

- Codex、Claude Code、Cursor、GitHub Copilotの生成物と配置を確認している
- 不要になった古い生成物を成功扱いしない条件がある
- `pnpm run rulesync:check`をCIで実行している
- RuleSyncの正本と生成物が同期していない場合にCIが失敗する
- docs-only判定との関係を確認している
- RuleSync ruleの分割や内容変更を混ぜていない

## 変更可能なファイル

- `.github/workflows/check.yml`
- RuleSyncの生成対象を確認するために必要な設定file
- `docs/tasks/0163-verify-rulesync-generated-files-in-ci.md`
- `docs/tasks/README.md`

## 対象外

- `.rulesync/rules/overview.md`の分割・方針変更
- Stop hookの変更
- application、test、dependencyの変更
- CI全体の選択的実行・並列化

## 関連

- [ADR-0001: AI向け作業ルールをRuleSyncで管理しAGENTS.mdへ生成する](../adr/0001-use-agents-md-for-codex-rules.md)
- [ADR-0014: AI開発ハーネスの責務と導入順を定義する](../adr/0014-define-ai-development-harness.md)

## 確認方法

- `pnpm run rulesync:generate`
- `pnpm run rulesync:check`
- 正本だけを変更した一時差分で`rulesync:check`が失敗することを確認する
- `git diff --check`

## 実施結果

| target         | rule生成物                        | hook生成物                                |
| -------------- | --------------------------------- | ----------------------------------------- |
| Codex CLI      | `AGENTS.md`                       | `.codex/hooks.json`、`.codex/config.toml` |
| Claude Code    | `CLAUDE.md`                       | `.claude/settings.json`                   |
| Cursor         | `.cursor/rules/overview.mdc`      | `.cursor/hooks.json`                      |
| GitHub Copilot | `.github/copilot-instructions.md` | `.github/hooks/copilot-hooks.json`        |

- すべての生成物がGit管理中であることを確認した
- 既存の`Check` workflowでdependency install直後に`pnpm run rulesync:check`を実行するようにした
- `Check` workflowはdocs-only判定に関係なくすべてのPRで動くため、RuleSyncだけを変更したPRでも同期を検証する
- `rulesync.jsonc`の`delete`を`true`にし、RuleSyncが認識する孤立生成物を`rulesync:check`で失敗として扱うようにした
- 正本だけへ一時markerを追加した状態で、4つのrule生成物を未更新として検出し、exit code 1になることを確認した
- 一時的なCursorの孤立rule fileを、削除対象として検出し、exit code 1になることを確認した
- 一時差分をすべて削除した後に`pnpm run rulesync:generate`と`pnpm run rulesync:check`が成功した
- RuleSyncが認識しないpathや、設定からtarget自体を削除した後の未知の旧生成物までは自動検出の対象外とする
- RuleSync rule、hook、application、test、dependency、新しいworkflow・job、docs-only判定、並列化は変更していない
