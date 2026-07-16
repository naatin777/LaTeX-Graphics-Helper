# ADR-0016: v1のAI作業ルールは手書きAGENTS.mdを正本にする

## ステータス

採用

## 日付

2026-07-16

## 背景

RuleSync、生成物、Stop hook、task preflightを組み合わせた運用は、変更内容よりもハーネスの同期と書式の維持に広い確認範囲を要求した。v1では、これらを必須導線にすると人間のレビュー面積と誤変更のリスクが増える。

## 決定

v1のproject共通作業ルールは、repository rootの手書き`AGENTS.md`を正本とする。`CLAUDE.md`、`.cursor/rules/overview.mdc`、`.github/copilot-instructions.md`は必要な場合だけ`AGENTS.md`への短いbridgeとして置く。

RuleSyncの生成、同期check、Stop hook、Current Task・Allowed files・Evidence matrixの機械的な必須検証は、v1の正式checkから外す。`.rulesync/`とrulesync dependencyは履歴確認や将来の再評価のために残してよいが、現在のrule正本やCIの成立条件として扱わない。

taskは軽量なMarkdown記録とし、目的、変更内容、対象外、確認方法、結果を基本構成とする。高リスクtaskだけ追加の証拠や判断を記録する。

## 理由

- repositoryの入口を人間が直接読める
- taskの書式検証が仕様・実装・テストの一致を過大に保証しない
- Stop hookによる作業終了時の副作用をなくせる
- 既存の安全性check、Lefthook、CI、形式別回帰テストの責務を維持できる

## 結果・影響

- ルール変更は`AGENTS.md`を直接レビューする
- RuleSync生成物の同期漏れを理由にCIを失敗させない
- taskのCurrent Task、Allowed files、Evidence matrixは人間が必要に応じて確認する
- RuleSyncを再導入する場合は、生成物、hook、CIへの影響を別のADRで判断する

## 関連

- [ADR-0001: AI向け作業ルールをRuleSyncで管理しAGENTS.mdへ生成する](0001-use-agents-md-for-codex-rules.md)（置き換え済み）
- [ADR-0014: AI開発ハーネスの責務を分離する](0014-define-ai-development-harness.md)
- [0196: v1構造とハーネスを簡素化する](../tasks/0196-simplify-v1-architecture-and-harness.md)
