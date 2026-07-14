# タスク: AI開発ハーネスの最小構成を設計する

## Status

Done

## 目的

RuleSync、AI向けルール、skills、hooks、Lunaへの作業委譲、worktree、権限、テスト・CIの関係を整理し、このプロジェクトで必要なAI開発ハーネスの最小構成と導入順を決める。

設定やskillを一括実装せず、後続タスクを1目的ずつ作れる状態にする。

## 決めること

- AI開発ハーネスを構成する各要素の責務
  - Rules
  - Tasks
  - Skills
  - Hooks
  - Agent delegation
  - Worktree / branch
  - Permissions
  - Local verification / CI
- リポジトリで共有する設定と、個人環境だけで管理する設定の境界
- Codexが担当する作業と、Lunaへ委譲できる作業の基準
- 並列作業と「Current Taskは1つ」のルールを両立する方法
- `next/v1`へ直接pushせず、専用branchとPRを使う運用
- `.rulesync/rules/overview.md`を分割する必要性と、分割する場合の単位
- task用skillを作る必要性と、skillへ含めない判断事項
- 既存のテスト・CIを変更影響に応じて選ぶ責務を、rule・skill・script・workflowのどこへ置くか
- 後続タスクの優先順位

## 完了条件

- 現在のRuleSync、hooks、Codex設定、task管理、Electron test harness、CIの役割を棚卸ししている
- 最小構成と対象外をADRへ記録している
- Lunaへ委譲できる作業と、Codexまたはユーザー判断が必要な作業を区別している
- worktreeを使う条件と使わない条件を決めている
- repository設定と個人設定の境界を決めている
- 一度に導入せず、必要な後続タスクへ分割している
- application実装、test、CI、RuleSync生成物、hook、skillを変更していない

## 変更可能なファイル

- `docs/adr/0014-define-ai-development-harness.md`
- `docs/tasks/0156-design-ai-development-harness.md`
- `docs/tasks/README.md`
- `docs/tasks/0157-document-next-v1-branch-workflow.md`
- `docs/tasks/0158-split-rulesync-rules-by-responsibility.md`
- `docs/tasks/0159-design-ai-task-routing-skill.md`
- `docs/tasks/0160-design-worktree-parallel-workflow.md`
- `docs/tasks/0161-design-change-based-ci-scope.md`
- `docs/tasks/0162-audit-offline-vsix-cross-platform.md`
- `docs/tasks/0163-verify-rulesync-generated-files-in-ci.md`
- `docs/tasks/0164-design-safe-stop-fix-hook.md`

## 対象外

- `.rulesync/rules/overview.md`の分割
- `AGENTS.md`やRuleSync生成物の変更
- skill、subagent設定、hook、scriptの追加
- `.codex/`と個人のCodex設定の変更
- worktreeの作成・削除
- GitHub Actionsとpackage scriptの変更
- dependency追加
- application実装とtestの変更

## 関連

- [ADR-0001: AI向け作業ルールをRuleSyncで管理しAGENTS.mdへ生成する](../adr/0001-use-agents-md-for-codex-rules.md)
- [ADR-0005: Codexの変更範囲を小さく制限する](../adr/0005-limit-codex-change-scope.md)
- [ADR-0013: VS Code ElectronをWebview visual testに使う](../adr/0013-use-vscode-electron-for-webview-visual-tests.md)
- [0033: RuleSyncでAI作業ルールを一元管理する](0033-adopt-rulesync-for-ai-rules.md)
- [0151: CI環境変数のローカル・CI運用を整理する](0151-document-ci-env-policy.md)
- [0153: VS Code Electron Playwright harnessを追加する](0153-add-vscode-electron-harness.md)

## 確認方法

- ADRの各判断が既存ルールと矛盾していないことを確認する
- 後続タスクが1タスク1目的になっていることを確認する
- `git diff --check`

## 実施結果

- AI開発ハーネスとVS Code Electron test harnessを区別した
- Rules、Tasks、ADR / Specs、Skills、Hooks、agent delegation、worktree、permissions、local verification / CIの責務をADR-0014へ記録した
- repository共有設定と、model・承認頻度などの個人設定の境界を決めた
- Luna `xhigh`へ委譲する作業と、Codexまたはユーザーが判断する作業を整理した
- Current Taskを1つに保つ並列作業とworktreeの条件を決めた
- `next/v1`運用、RuleSync分割、task skill、worktree、選択的CI、offline VSIX確認を独立した後続タスクへ分けた
- Lunaの監査で見つかったRuleSync生成物のCI同期確認とStop hookのdirty worktree方針を、rule分割とは別の後続タスクへ分けた
- Software Change Harnessの考え方を、全タスクへ長い手順を強制しないrisk比例型の変更原則としてADR-0014と0159へ要約した
