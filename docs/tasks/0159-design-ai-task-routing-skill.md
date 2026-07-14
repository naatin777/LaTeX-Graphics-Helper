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
- 通常の小さな変更と、境界・security・互換性に関わる変更で確認の深さを変える方法
- 問題、完了条件、非対象、未確認事項をどの程度出力するか
- policyを局所的な分岐へ継ぎ足さず、名前付き境界にする判断条件
- 境界の入力、出力、throw、秘匿、fallback、失敗時保証の確認方法
- production code、test、commit / PR / ADR、code commentへ残す情報の役割
- 実装後にpatch-chain、二次障害、過剰な抽象化を見直す手順

## 完了条件

- 現行の公式Codex仕様を確認してskillの配置と呼び出し方法を決めている
- ruleとskillに同じ長い手順を重複させない方針がある
- Lunaへ委譲する条件と、委譲しない条件を具体化している
- 1つのCurrent Taskと整合している
- 長い定型workflowを全タスクへ強制せず、riskに応じた最小手順になっている
- 敵対的入力testを、`unknown`や外部messageなど必要な境界だけへ限定している
- non-throwing境界と、意図的にthrowするvalidation境界を区別している
- 「コードはHow、testはWhat、commit / PR / ADRはWhy、commentはWhy not」という役割をprojectの言語・commit方針と両立させている
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

## 参考として要約する考え方

- 実装手段より先に、現在と期待する振る舞いの差を定義する
- 抽象的な品質語ではなく、観測可能な問題と契約を変更根拠にする
- policy-heavyな処理を無関係なcallerの分岐へ継ぎ足さない
- 名前付き境界を導入する前に、入力、出力、throw、秘匿、fallbackを決める
- fallbackとerror処理自身が新しい失敗原因にならないことを確認する
- hostile objectのtestは、外部または`unknown`の境界に限定する
- 実装後は機能適合性、patch-chain、二次障害、過剰設計を差分から見直す

添付されたSoftware Change Harnessをそのままskillへ複製せず、このprojectの1タスク1目的、Test / Implementation Separation、既存test policyへ合わせて短くする。

## 確認方法

- skillに含める手順と含めない判断事項を見直す
- 公式情報源、確認日、未確認事項がresearch noteに記録されていることを確認する
- `git diff --check`
