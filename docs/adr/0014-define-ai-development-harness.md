# ADR-0014: AI開発ハーネスの責務と導入順を定義する

## ステータス

採用

## 日付

2026-07-14

## 背景

このプロジェクトには、RuleSyncから生成するAI向けルール、タスク管理、Stop hook、Codex固有設定、ローカル確認command、GitHub Actionsがすでに存在する。VS Code Electronを操作するテスト用harnessも導入済みである。

一方、`.rulesync/rules/overview.md`へ多くの方針が集まり、ルール、手順、個人設定、作業委譲、並列作業の境界が分かりにくくなっている。すべてを共通ruleへ追加すると、各AIが毎回読む情報が増える。すべてをskillへ移すと、常に守るべき制約がskillを使わない作業へ伝わらない。

また、Codexの利用量を抑えるためにLunaへ作業を委譲したいが、判断や書き込みまで無制限に並列化すると、1タスク1目的、Current Taskは1つ、変更範囲を小さくするという既存方針と衝突する。

ここでいうAI開発ハーネスは、AIがタスクを選び、調査し、変更し、確認してPRへ渡すまでの開発運用を指す。ADR-0013のVS Code Electron test harnessとは別のものである。

## 決定

### 構成要素の責務

| 要素                    | 責務                                             | 含めないもの                                                |
| ----------------------- | ------------------------------------------------ | ----------------------------------------------------------- |
| Rules                   | すべての作業で常に守る短い制約と原則             | タスク固有の手順、長い操作手順、個人のmodel・承認設定       |
| Tasks                   | その作業だけの目的、変更範囲、完了条件、確認方法 | 恒久的な共通ルール、複数課題のバックログ台帳                |
| ADR / Specs             | 継続する設計判断と利用者向け仕様                 | 実行のたびに変わる作業手順                                  |
| Skills                  | 複数タスクで繰り返す、開始からhandoffまでの手順  | プロジェクト固有の設計判断、危険操作の包括許可              |
| Hooks                   | 安価で決定的な自動処理                           | 長時間のtest、仕様判断、自動commit・push・merge             |
| Agent delegation        | 境界を明示できる読み取り・調査・独立作業の委譲   | 最終判断、範囲が曖昧な変更、競合する同時編集                |
| Worktree / branch       | 独立した作業領域と履歴の分離                     | タスク分割の代用、同じファイルを複数agentで同時編集すること |
| Permissions             | 危険操作を止める最小限の共有ルール               | 個人の承認頻度、model選択、認証情報                         |
| Local verification / CI | ローカルの早い確認と、共有環境での最終確認       | Rules内に固定した巨大なcommand対応表                        |

### 正本と共有範囲

- プロジェクト共通のAIルールとhook定義は、ADR-0001どおり`.rulesync/`を正本とする。
- `AGENTS.md`、`.codex/hooks.json`などRuleSyncの出力は生成物としてGit管理する。
- タスクの正本は`docs/tasks/*.md`とし、`docs/tasks/README.md`はCurrent Taskと一覧だけを持つ。
- 採用した設計判断はADR、機能仕様はspec、外部調査の事実はresearch noteへ置く。
- repositoryの`.codex/config.toml`には、プロジェクト全員に必要な機能だけを置く。
- 承認頻度、既定model、利用量、個人環境の実行許可は個人設定で管理し、repositoryへ固定しない。
- 削除、merge、認証情報、workspace外書き込みなどの危険操作を止める規則は共有できるが、危険操作まで無条件に許可する設定は共有しない。

### RuleSync ruleの分割

`.rulesync/rules/overview.md`は責務が多いため、意味を変えずに次の単位へ分割する。

- 作業範囲、事前確認、リファクタリング、重複の扱い
- test、Test / Implementation Separation、CI環境変数
- documentation、言語、外部調査
- commit、branch、PR、review、作業後報告
- lint / formatの自動修正

実際のファイル名とRuleSyncの生成結果は後続タスクで確認する。分割と新しい運用ルールの追加は同じタスクで行わない。

分割中は既存の`overview.md`を正本として残し、全targetの生成物と同期確認が成功してから分割後のfileへ切り替える。`rulesync.jsonc`のtargetとGit管理中の生成物の対応、CIでの`rulesync:check`実行は分割前に確認する。

### CodexとLunaの分担

Lunaは`gpt-5.6-luna`の推論レベル`xhigh`を、安価な並列作業の既定候補として使う。ただし、model名と推論レベルは利用環境側の指定であり、repositoryの恒久設定にはしない。

| 作業                                 | 既定担当        | 条件                                                              |
| ------------------------------------ | --------------- | ----------------------------------------------------------------- |
| repository内の事実確認、関連file探索 | Luna            | 読み取り専用で質問を具体化できる                                  |
| test log、CI log、差分の分類         | Luna            | 修正判断とGitHub操作はCodexが行う                                 |
| 複数案の比較、既存docsの重複調査     | Luna            | 採用判断はCodexまたはユーザーが行う                               |
| 所有fileが明確な独立実装             | Luna候補        | Current Task内、競合なし、Codexが差分をreviewする                 |
| 仕様決定、security判断、破壊操作     | Codexとユーザー | Lunaだけで確定しない                                              |
| task統合、commit、push、PR作成       | Codex           | taskまたはユーザーが許可したworkflowの範囲で行う                  |
| review commentの判断                 | Codex           | 返信、thread解決、review submitはユーザーの明示依頼なしに行わない |
| 曖昧な依頼、変更範囲が広がる作業     | ユーザー確認    | agentへ委譲する前に範囲を決める                                   |

委譲時は、目的、読み書き可能なfile、禁止事項、期待する出力を明示する。Codexは同じ調査を最初からやり直さず、結果を統合するために必要な確認だけを行う。

### Current Taskと並列作業

- 既定はCurrent Taskを1つ、書き込み担当を1つとし、Lunaには読み取り専用のside taskを並列委譲する。
- 1つのCurrent Taskを、互いに独立したfile ownershipへ分割できる場合だけ、複数の書き込みagentを検討する。
- 複数agentは同じfileを編集しない。統合、確認、commitは1つのtask branchでCodexが行う。
- 独立した複数タスクを同時にIn Progressへせず、worktreeをバックログ消化のために常用しない。
- worktreeは、Current Task内の隔離実験、競合しない実装、またはユーザーが明示した緊急修正に限定する。
- worktreeを使っても、1タスク1目的、変更可能file、branch・PRルールは変わらない。
- worktreeの作成、統合、後片付けを自動化する前に、branch命名、所有file、成果の取り込み、失敗時の破棄方法を別タスクで決める。

### BranchとPR

- `next/v1`を通常作業の統合先とする期間は、最新の`next/v1`からtask branchを作る。
- `next/v1`へ直接commitまたはpushしない。
- task branchから`next/v1`へPRを作る。
- `next/v1`からmainへのPRは、ユーザーが明示的に依頼するまで作らない。
- commit messageとPR titleは既存のConventional Commitsと言語方針に従う。

この運用は現在のRuleSync ruleに未記録なので、rule分割とは別の後続タスクで先に反映する。

### Skillsと確認command

- task用skillは、現在のtaskを読む、branchを確認する、変更範囲を守る、必要な確認を選ぶ、差分をreviewする、handoffする、という反復手順だけを持つ。
- skillは仕様や完了条件を推測せず、task fileとADR / specを参照する。
- Lunaへの委譲可否は、変更の難しさではなく、境界とownershipを明示できるかで判断する。
- 変更fileから実行すべきtestを選ぶ知識は、対応が安定するまではtaskとtest policyに置く。Ruleへ巨大な対応表を入れない。
- 対応が安定したら、判定はscript、実行条件はworkflow、AIからの呼び出し手順はskillへ分ける。
- CIの選択的実行は、未知の変更を安全側で全実行に倒せる設計を先に行い、時間短縮を測定してから実装する。
- 現在のStop hookは`pnpm run check:fix`を実行し、既存のdirty worktreeへ変更を加える可能性がある。hookを拡張する前に、既存差分を守る条件と失敗時の扱いを別タスクで決める。
- `test:all`、`test:playwright:electron`、3 OSの外部CLI testは同じ範囲ではない。選択的CIの設計では、command名だけで「全test」と判断せず、含まれるsuiteを対応表へ記録する。

### ソフトウェア変更時の判断原則

task用skillへ含める実装手順は、すべての変更へ長い定型出力を強制せず、変更のriskに比例させる。通常の小さな変更では、現在の問題、完了条件、非対象、未確認事項をtaskから確認できればよい。外部入力、path、Webview message、error整形、秘匿、fallbackなどを扱う境界では、次の契約を実装前に明確にする。

- 入力と出力
- 例外を送出してよいか
- 失敗時に部分的な状態変更を許すか
- logやerrorへ含めてよい情報
- fallbackと、fallback自身が失敗した場合の保証

抽象的な「clean」「保守性」「best practice」だけを変更理由にしない。観測できる不具合、契約違反、同じpolicyの重複、変更時に同時修正が必要な箇所、test困難性など、このrepositoryで確認できる根拠へ置き換える。

複雑なpolicyを、無関係な呼び出し元の`if` / `else` / `try` / `catch`へ継ぎ足し続けない。validation、変換、秘匿、error整形、fallbackなどが1つのpolicyを構成する場合は、入力・出力・失敗時保証を持つ名前付き境界として分離する。ただし、単純な条件分岐を別fileへ移すだけで読む範囲や間接参照が増える場合は分離しない。

境界のtestは、契約に応じて正常値、malformedな値、依存処理の失敗、fallbackの失敗を確認する。`unknown`、外部message、serialization対象、plugin由来の値など、敵対的なobjectを受け得る境界に限り、例外を投げるgetter、循環参照、`Proxy`なども検討する。すべての関数へ敵対的入力testを追加しない。

非throwを保証するnormalization・diagnostic境界では、malformedまたは敵対的な入力でもthrowしないことをtestする。validation境界が意図的にthrowする場合は、制御されたerrorになること、秘匿情報を含まないこと、部分的な状態変更を残さないことをtestする。「境界関数は常にthrowしない」という一律ルールにはしない。

情報の置き場所は、原則として次のように分ける。

- production codeは、処理をどのように実現するかを表す
- test codeは、外から観測できる何を保証するかを表す
- commit、PR、ADRは、なぜ変更または判断が必要かを残す
- code commentは、処理の言い換えではなく、なぜ素直な別案を採用できないかという制約を残す

実装後は、要求を満たすかだけでなく、policyが呼び出し元の分岐へ埋まっていないか、fallbackが二次障害を起こさないか、要求にない抽象化を増やしていないかを差分から見直す。

### 導入順

1. 現在の`next/v1` branch・PR運用をRuleSyncへ記録する。
2. RuleSyncのtargetと生成物の対応を確認し、生成差分をCIで検出する。
3. Stop hookがdirty worktreeへ与える影響と安全条件を決める。
4. `.rulesync/rules/overview.md`を意味を変えず責務別に分割する。
5. task実行とLuna委譲を行うskillの仕様を、繰り返す手順が固まった段階で決める。
6. 独立した書き込み作業が繰り返し必要になった場合だけ、worktree並列運用を設計する。
7. 変更影響に応じたCI scopeを設計し、実測可能な小さな改善として導入する。

VSIXのオフライン・3 OS動作確認はAI開発ハーネスとは別のリリース準備として管理する。

## 理由

- 常に読むruleを短く保ち、必要な手順だけをskillから使える。
- task固有の判断を共通ruleへ蓄積せず、完了済みtaskの再利用も避けられる。
- Lunaへ読み取りや分類を委譲しながら、仕様・security・Git操作の最終責任をCodexとユーザーに残せる。
- worktreeの並列性より、変更範囲と統合責任の明確さを優先できる。
- 個人の承認設定をrepositoryへ強制せず、共有すべき危険操作だけをproject policyとして維持できる。
- CI選択ロジックをruleへ埋め込まず、将来のtest構成変更に追従しやすい。

## 代替案

### すべてoverview.mdへ書き続ける

単純だが、常に読む文量と責務の混在が増え、必要な情報を見つけにくくなるため採用しない。

### rulesを減らしてすべてskillへ移す

手順を必要時だけ読める一方、skillを使わない作業で変更範囲や安全ルールが欠落するため採用しない。

### 最初から複数worktreeと複数書き込みagentを常用する

並列性は上がるが、Current Task、file ownership、統合、test結果の責任が曖昧になるため採用しない。

### repositoryで承認を全面自動化する

個人環境とrisk toleranceをprojectが固定し、危険操作の見落としにつながるため採用しない。

## 結果・影響

- 当面は1つの書き込み担当と、Lunaの読み取り専用side taskを基本形とする。
- RuleSync ruleの文量は後続タスクで減らすが、既存ruleの意味は維持する。
- task用skill、worktree、選択的CIは一括導入せず、独立タスクで判断・実装する。
- RuleSync生成物の同期とStop hookの安全性を確認してからruleを分割する。
- 個人のCodex承認設定はこのrepositoryだけでは再現されない。
- VS Code Electron test harnessは継続利用するが、AI開発ハーネスの構成要素として再実装しない。

## 見直し条件

- Lunaへの委譲で統合コストが節約量を上回るとき
- 1つのCurrent Task内で独立した書き込み作業が継続的に3回以上発生したとき
- RuleSyncの複数rule生成方法または対象AIツールが変わったとき
- 選択的CIが必要なtestをskipしたとき
- 個人設定とrepository設定の境界がCodex側の仕様変更で変わったとき

## 関連

- [ADR-0001: AI向け作業ルールをRuleSyncで管理しAGENTS.mdへ生成する](0001-use-agents-md-for-codex-rules.md)
- [ADR-0005: Codexの変更範囲を小さく制限する](0005-limit-codex-change-scope.md)
- [ADR-0013: VS Code ElectronをWebview visual testに使う](0013-use-vscode-electron-for-webview-visual-tests.md)
- [0156: AI開発ハーネスの最小構成を設計する](../tasks/0156-design-ai-development-harness.md)
