# タスク: worktreeを使う並列作業の運用を設計する

## Status

Todo

## 目的

Current Taskを1つに保ちながら、競合しない調査・実装をworktreeで安全に並列化できる条件と統合手順を決める。

## 決めること

- worktreeを使う作業と使わない作業
- parent taskと並列subtaskの関係
- agentごとのfile ownership
- branch名とworktree配置
- 差分の取り込み、確認、commitの責任者
- `docs/tasks/README.md`とRuleSync生成物のような共有fileの更新責任者
- 失敗・中断・競合時の破棄方法
- prunableなworktreeと古いbranchの整理方法

## 完了条件

- 複数の独立タスクを同時にCurrent Taskへしない設計になっている
- 同じfileを複数agentが同時編集しない条件がある
- parent task、共有file、生成物を統合担当だけが更新する条件がある
- `next/v1`へ直接pushしない運用と整合している
- worktreeを使わない方がよい条件が明記されている
- 自動化が必要な場合は別の実装タスクを作っている
- このタスクではworktreeやbranchを作成・削除していない

## 変更可能なファイル

- `docs/tasks/0160-design-worktree-parallel-workflow.md`
- `docs/tasks/README.md`
- 必要な`docs/adr/`

## 対象外

- worktree、branch、script、skillの作成・削除
- 並列agentによるapplication実装
- RuleSync、hook、CI、dependencyの変更

## 関連

- [ADR-0014: AI開発ハーネスの責務と導入順を定義する](../adr/0014-define-ai-development-harness.md)

## 確認方法

- 通常作業、隔離実験、緊急修正、競合する編集の例で運用を確認する
- `git diff --check`
