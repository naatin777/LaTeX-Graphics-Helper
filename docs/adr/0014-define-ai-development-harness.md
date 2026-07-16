# ADR-0014: AI開発ハーネスの責務を分離する

## ステータス

採用

> 実装注記（2026-07-16）: v1ではこのADRの分離方針を保ちながら、常設ハーネスを縮小した。現在は手書き`AGENTS.md`、軽量task、Lefthook、CIを使用し、RuleSync同期check、Stop hook、Current Task preflightは正式導線に含めない。詳細は[ADR-0016](0016-use-handwritten-agents-for-v1.md)を参照する。

## 日付

2026-07-14

## 背景

このprojectには、RuleSyncから生成するAI向けルール、task管理、Stop hook、Codex固有設定、local verification、GitHub Actionsがある。さらに、AIへ調査や実装を委譲する機会が増えている。

これらの情報を1つのruleや文書へ集めると、常に読む情報が増え、永続する判断と一時的な手順が混在する。一方、すべてを必要時だけ使うskillへ移すと、作業範囲やsecurityなど常に守る制約が伝わらない。

AIがtaskを開始してからhandoffするまでの開発運用について、各構成要素の責務と共有範囲を分ける必要がある。

ここでいうAI開発ハーネスは開発運用を指し、ADR-0013で採用したVS Code Electron test harnessとは別のものである。

## 決定

AI開発ハーネスの情報を、次の責務へ分ける。

| 要素                    | 責務                                                  |
| ----------------------- | ----------------------------------------------------- |
| Rules                   | すべての作業で常に守る短い制約と原則                  |
| Tasks                   | 現在の1作業の目的、変更範囲、完了条件、確認方法       |
| ADR / Specs             | 永続する設計判断と利用者から見た仕様                  |
| Skills                  | 複数taskで繰り返す開始、確認、handoffの手順           |
| Hooks                   | 仕様判断を含まない、安価で決定的な自動処理            |
| Agent delegation        | 目的、ownership、禁止事項、出力を限定できる作業の委譲 |
| Worktree / branch       | 独立した作業領域と履歴の分離                          |
| Permissions             | 共有する危険操作の制約と、個人の承認設定の分離        |
| Local verification / CI | 手元での早い確認と、共有環境での最終確認              |

当初の設計ではStop hookを検証専用としたが、v1ではStop hook自体を使用しない。検証はLefthookとCIの正式commandで行い、runtime stagingへハーネスログを保存しない。

project共通のAIルールは手書きの`AGENTS.md`、taskは`docs/tasks/`、設計判断はADR、機能仕様はspec、外部調査はresearch noteを正本とする。repository固有のCodex/Stop hookは使用せず、Git hookはLefthook、共有検証はCIを使用する。

repositoryのCodex設定にはproject全体で必要な機能だけを置く。承認頻度、既定model、利用量、個人環境の実行許可は個人設定とし、repositoryへ固定しない。危険操作を無条件に許可する設定は共有しない。

既定の並列作業は、1つのCurrent Taskと1つの書き込み担当を維持し、境界を明示できる読み取り専用作業をside agentへ委譲する形とする。複数の書き込み担当を使う場合も、同じfileを編集せず、統合責任者を1人にする。

## 理由

- 常に守る制約と、必要時だけ読む手順を分けられる
- task固有の判断が共通ruleへ蓄積することを防げる
- modelや承認設定を他の開発者へ強制せず、共有すべきsecurity制約を維持できる
- agentへ作業を委譲しても、変更範囲と統合責任を明確にできる
- test harnessとAI開発運用を別々に変更できる

## 代替案

### すべてをRuleSync ruleへ記録する

共有場所は1つになるが、task固有の手順や変更されやすい情報まで全AIが毎回読むことになるため採用しない。

### rulesを減らしてすべてskillへ移す

必要時だけ手順を読めるが、skillを使わない作業で変更範囲やsecurity制約が欠落するため採用しない。

### 複数agentとworktreeを既定にする

並列性は上がるが、Current Task、file ownership、統合責任が曖昧になるため採用しない。

## 結果・影響

- RuleSync rule、task skill、worktree、CIはそれぞれ独立して設計・変更する
- 一時的なbranch運用、具体的なmodel、確認commandの対応表はADRへ固定しない
- Stop hookの自動修正や、dirty worktreeのskipを安全性の根拠にしない
- 当面は1つの書き込み担当と、読み取り専用side agentを基本形とする
- 手順の正本が複数の場所へ分かれるため、ADRと関連taskから正本へlinkする必要がある

## 見直す条件

- RuleSyncまたは利用するAI toolの責務が変わったとき
- 複数の書き込みagentを継続的に使う必要が生じたとき
- repository設定と個人設定の境界がtool側の仕様変更で変わったとき
- 分離した情報の正本が分かりにくくなったとき

## 関連

- [ADRの運用方針](README.md)
- [ADR-0001: AI向け作業ルールをRuleSyncで管理しAGENTS.mdへ生成する](0001-use-agents-md-for-codex-rules.md)
- [ADR-0005: Codexの変更範囲を小さく制限する](0005-limit-codex-change-scope.md)
- [ADR-0013: VS Code ElectronをWebview visual testに使う](0013-use-vscode-electron-for-webview-visual-tests.md)
- [0157: next/v1のbranch・PR運用をRuleSyncへ記録する](../tasks/0157-document-next-v1-branch-workflow.md)
- [0158: RuleSync ruleを責務別に分割する](../tasks/0158-split-rulesync-rules-by-responsibility.md)
- [0159: task実行とLuna委譲を行うskillを設計する](../tasks/0159-design-ai-task-routing-skill.md)
- [0160: worktreeを使う並列作業の運用を設計する](../tasks/0160-design-worktree-parallel-workflow.md)
- [0161: 変更影響に応じたCI scopeを設計する](../tasks/0161-design-change-based-ci-scope.md)
- [0163: RuleSync生成物の同期をCIで検証する](../tasks/0163-verify-rulesync-generated-files-in-ci.md)
- [0164: Stop hookのdirty worktree方針を決める](../tasks/0164-design-safe-stop-fix-hook.md)
- [0188: AIハーネスとStop hookを検証専用にする](../tasks/0188-build-task-preflight-and-stop-harness.md)
- [ADR-0016: v1のAI作業ルールは手書きAGENTS.mdを正本にする](0016-use-handwritten-agents-for-v1.md)
