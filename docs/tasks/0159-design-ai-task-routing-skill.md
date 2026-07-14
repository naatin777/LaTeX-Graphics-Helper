# タスク: task実行とLuna委譲を行うskillを設計する

## Status

Todo

## 目的

現在のtaskを開始してからhandoffするまでの反復手順と、Lunaへ委譲する判断をskillへまとめる必要性・範囲・配置を決める。

## 決めること

- skillをrepository共有にするか個人skillにするか
- task、ADR、spec、RuleSync ruleとの責務境界
- `gpt-5.6-luna`の推論レベル`xhigh`へ委譲する作業
- 委譲promptに必要な目的、ownership、禁止事項、期待する出力
- Codexが保持する仕様・security・Git / PRの最終判断
- task種別から選ぶローカル確認command
- skillがbranch作成、commit、push、PRを自動実行する範囲

## 完了条件

- 現行の公式Codex仕様を確認してskillの配置と呼び出し方法を決めている
- ruleとskillに同じ長い手順を重複させない方針がある
- Lunaへ委譲する条件と、委譲しない条件を具体化している
- 1つのCurrent Taskと整合している
- skill実装が必要な場合は別の実装タスクを作っている
- skill、hook、Codex設定をこのタスクで変更していない

## 変更可能なファイル

- `docs/tasks/0159-design-ai-task-routing-skill.md`
- `docs/tasks/README.md`
- 必要な`docs/adr/`
- 必要な`docs/research/`

## 対象外

- skillの作成・install
- RuleSync rule、hook、個人Codex設定の変更
- worktree運用の設計
- application、test、CI、dependencyの変更

## 関連

- [ADR-0014: AI開発ハーネスの責務と導入順を定義する](../adr/0014-define-ai-development-harness.md)

## 確認方法

- skillに含める手順と含めない判断事項を見直す
- 公式情報源、確認日、未確認事項がresearch noteに記録されていることを確認する
- `git diff --check`
