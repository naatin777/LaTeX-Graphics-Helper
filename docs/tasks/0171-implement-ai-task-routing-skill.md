# タスク: task実行とLuna委譲を行うskillを実装する

## Status

Todo

## 目的

0159で決めた設計に基づき、このprojectのtask開始、確認、Luna委譲、handoffを支援するrepository共有skillを最小構成で追加する。

## 完了条件

- repository共有skillとして `.agents/skills/lgh-task-runner/SKILL.md` を追加している
- skillのfrontmatter `description` が、docs/tasksを進める場合にtriggerし、一般的な実装作業へ過剰にtriggerしない内容になっている
- AGENTS.md / RuleSync ruleと同じ長い手順を重複させていない
- task開始時に読む文書、1タスク1目的、変更範囲、確認方法、handoffの手順を短く示している
- Luna `xhigh` へ委譲する条件、委譲しない条件、委譲promptの必須要素を示している
- Codex本体が仕様、security、Git / PR、最終統合判断を保持することを明記している
- boundary-heavy変更で確認する契約項目を示している
- skill-creatorのvalidationを実行している
- 必要なら実際の小さいdocs taskでforward-testし、結果を記録している

## 変更可能なファイル

- `.agents/skills/lgh-task-runner/SKILL.md`
- `.agents/skills/lgh-task-runner/agents/openai.yaml`
- 必要な `.agents/skills/lgh-task-runner/references/`
- `docs/tasks/0171-implement-ai-task-routing-skill.md`
- `docs/tasks/README.md`

## 対象外

- 個人のCodex設定変更
- RuleSync rule、hook、CI、application code、test codeの変更
- custom agent fileの追加
- worktree運用の実装
- Lunaのmodel availabilityをrepositoryで固定すること

## 関連

- [0159: task実行とLuna委譲を行うskillを設計する](0159-design-ai-task-routing-skill.md)
- [ADR-0014: AI開発ハーネスの責務を分離する](../adr/0014-define-ai-development-harness.md)
- [Codex skill と agent routing の確認メモ](../research/2026-07-14-codex-skill-and-agent-routing.md)

## 確認方法

- skill-creatorの `quick_validate.py` でskill構造を検証する
- skillのdescriptionが過剰に長くないことを確認する
- `git diff --check`
