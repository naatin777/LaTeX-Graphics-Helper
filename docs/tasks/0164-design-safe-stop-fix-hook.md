# タスク: Stop hookのdirty worktree方針を決める

## Status

Todo

## 目的

AI停止時に`pnpm run check:fix`を実行する既存Stop hookが、ユーザーや別作業の未コミット差分を意図せず変更しないための実行条件と失敗時の扱いを決める。

## 決めること

- clean / dirty worktreeでhookを実行する条件
- task対象fileと無関係な差分へ自動修正が及ぶ場合の扱い
- 自動修正前後の差分を判定する方法
- hookをskip・失敗・警告のどれにするか
- formatterが複数fileへ変更を加えた場合の復元責任
- Stop hookに残す処理と、task skillへ移す処理

## 完了条件

- ユーザーの既存差分を暗黙に書き換えない方針がある
- Stop hookのstdout JSON制約を維持している
- hookが失敗しても作業結果を失わない設計になっている
- 自動修正の利便性を残す条件を明記している
- 実装が必要な場合はtestと実装を別タスクへ分けている
- hook、script、RuleSync生成物をこのタスクで変更していない

## 変更可能なファイル

- `docs/tasks/0164-design-safe-stop-fix-hook.md`
- `docs/tasks/README.md`
- 必要な`docs/adr/`

## 対象外

- `.rulesync/hooks/stop-fix.sh`の変更
- RuleSync生成物の変更
- lint / format commandの変更
- application、test、CI、dependencyの変更

## 関連

- [ADR-0001: AI向け作業ルールをRuleSyncで管理しAGENTS.mdへ生成する](../adr/0001-use-agents-md-for-codex-rules.md)
- [ADR-0014: AI開発ハーネスの責務と導入順を定義する](../adr/0014-define-ai-development-harness.md)
- [0037: RuleSyncのStop hookでlint/format自動修正を実行する](0037-add-rulesync-stop-fix-hook.md)

## 確認方法

- clean、task対象だけdirty、無関係なfileがdirtyの3例で方針を確認する
- `git diff --check`
