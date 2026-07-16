# ADR-0001: AI向け作業ルールをRuleSyncで管理しAGENTS.mdへ生成する

## ステータス

置き換え済み

> v1では、RuleSyncを必須導線から外し、手書き`AGENTS.md`を正本にする判断へ置き換えた。現在の判断は[ADR-0016](0016-use-handwritten-agents-for-v1.md)を参照する。

## 日付

2026-06-21

## 背景

Codexへ作業を依頼するたびに、変更範囲や作業方針について同じ注意を伝える必要があった。注意が不足すると、機能追加とリファクタリングが混ざる、大きな変更が一度に行われる、現在のtaskと無関係なfileまで変更される、といった問題が起きやすい。

また、Codex以外のAI開発toolも使う可能性が高くなった。`AGENTS.md`だけを正本にすると、他のAI toolへ同じruleを反映するときに手作業の複製が必要になり、内容がずれる可能性がある。

複数のAI toolへ共通ruleを配布しながら、変更する正本を1か所にする必要がある。

## 決定

AI向けのproject共通作業ruleは、RuleSyncの`.rulesync/`を意味の正本として管理する。

`AGENTS.md`など各AI tool向けのrule fileは、RuleSyncから生成する。生成対象と出力先は`rulesync.jsonc`を正本とする。

task固有の目的、変更範囲、完了条件は共通ruleへ入れず、`docs/tasks/*.md`で管理する。

## 理由

- 複数のAI toolへ同じproject ruleを配布できる
- ruleを変更する正本を`.rulesync/`へ限定できる
- toolごとのfileを手作業で同期する必要がなくなる
- 恒久的なruleとtask固有の指示を分離できる

## 代替案

### 依頼ごとにruleを伝える

taskに合わせて調整しやすいが、同じ説明の繰り返しと指示漏れが発生するため採用しない。

### AGENTS.mdだけを正本にする

Codex向けには単純だが、他のAI toolへ同じruleを配布しづらいため採用しない。

### toolごとのrule fileを手作業で管理する

生成toolは不要になるが、同じruleの重複と同期漏れが発生するため採用しない。

## 結果・影響

- project共通ruleを変更するときは`.rulesync/`を更新し、RuleSyncで各tool向けfileを生成する
- 生成fileを直接編集せず、RuleSyncの正本へ変更を戻す必要がある
- RuleSync自体と生成手順をprojectで維持する必要がある
- task固有の指示は`docs/tasks/`を別の正本として参照する

## 見直す条件

- RuleSyncがmaintenanceされなくなったとき
- 利用するAI toolがRuleSyncの生成対象から外れたとき
- RuleSync以外に、複数AI toolへ安全にruleを同期できる方法を採用するとき
- `.rulesync/`が大きくなり、共通ruleを正確に把握しづらくなったとき

## 関連

- [ADRの運用方針](README.md)
- [ADR-0005: Codexの変更範囲を小さく制限する](0005-limit-codex-change-scope.md)
- [ADR-0014: AI開発ハーネスの責務を分離する](0014-define-ai-development-harness.md)
- [0033: RuleSyncでAI作業ルールを一元管理する](../tasks/0033-adopt-rulesync-for-ai-rules.md)
- [0037: RuleSyncのStop hookでlint/format自動修正を実行する](../tasks/0037-add-rulesync-stop-fix-hook.md)
- [0038: Codex Stop hookのJSON出力エラーを修正する](../tasks/0038-fix-codex-stop-hook-json-output.md)
- [0163: RuleSync生成物の同期をCIで検証する](../tasks/0163-verify-rulesync-generated-files-in-ci.md)
- [0164: Stop hookのdirty worktree方針を決める](../tasks/0164-design-safe-stop-fix-hook.md)
- `rulesync.jsonc`
- `.rulesync/hooks.json`
- `.rulesync/hooks/stop-fix.sh`
