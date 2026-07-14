# タスク: task実行とLuna委譲を行うskillを設計する

## Status

Done

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

## 実施結果

- 現行の公式Codex manualを確認し、skill配置、呼び出し方法、AGENTS.md、hooks、rules、subagentの責務境界をresearch noteへ記録した
- このprojectのtask実行workflowは、repository共有skillとして `.agents/skills/lgh-task-runner` に置く方針にした
- skillはinstruction-onlyから開始し、script、hook、RuleSync rule、個人Codex設定はこのskillへ含めない方針にした
- AGENTS.md / RuleSync ruleには常に守る短い制約だけを置き、skillには必要時に読む反復手順を置く方針にした
- Luna `xhigh` への委譲は、読み取り中心の調査、CI/log分析、test gap確認、独立した小さいpatchに限定する方針にした
- Codex本体は、仕様、security、Git / PR、最終統合、ユーザー確認が必要な判断を保持する方針にした
- branch作成はtask実行時の通常手順に含めるが、commit、push、PR作成は現在のtaskまたはユーザーが明示している場合だけ行う方針にした
- boundary-heavy変更では、入力、出力、throw、秘匿、fallback、失敗時保証を名前付き境界として確認する方針にした
- 「コードはHow、testはWhat、commit / PR / ADRはWhy、commentはWhy not」は、projectの日本語docs方針とConventional Commit方針に合わせて、skillでは役割分担として短く扱う方針にした
- skill実装は別タスク [0171: task実行とLuna委譲を行うskillを実装する](0171-implement-ai-task-routing-skill.md) に分けた

## 設計決定

### 配置

task実行skillはrepository共有にする。配置候補は `.agents/skills/lgh-task-runner`。

理由は、このworkflowがこのrepositoryの `docs/tasks/`、ADR、RuleSync rule、branch運用、確認commandに依存するため。個人skillへ置くと、他のAIや別環境で同じ作業手順を共有しにくい。

一方、model既定値、承認頻度、使用量節約の個人方針はrepositoryへ固定しない。Luna `xhigh` は「利用できる場合に委譲先として選ぶ」扱いに留める。

### skillに含めること

- Current Taskまたは指定taskを確認する手順
- `PROJECT_STATE.md`、`docs/tasks/README.md`、対象task、関連ADR / specs / researchを読む順番
- task種別ごとの最小確認command
- Lunaへ委譲する条件と、委譲しない条件
- Luna promptの必須要素
  - 目的
  - ownership
  - 変更禁止範囲
  - 期待する出力
  - 最終判断者がCodex本体であること
- boundary-heavy変更時の確認項目
- handoff / 完了報告 / PR本文へ残す最小情報

### skillに含めないこと

- application固有の仕様判断
- taskごとの変更内容そのもの
- hookの実装詳細
- rulesのallow list
- CI workflowの具体実装
- 個人Codex設定
- worktree運用の詳細
- 長いreview checklistを全taskへ強制すること

### Lunaへ委譲する条件

委譲してよい作業:

- repository内の読み取り専用調査
- docs、ADR、taskの整合性レビュー
- CI logやtest failureの原因候補整理
- test gap、boundary漏れ、patch-chain臭の指摘
- ownershipが明確で、他fileと衝突しない小さいpatch

Lunaの出力は命令ではなく提案として扱う。Codex本体が根拠、差分、未確認事項を確認してから採用する。

委譲しない作業:

- 仕様、security、public API、依存追加、構成変更の最終判断
- Git操作、push、PR作成、review comment対応の最終判断
- ユーザー確認が必要な判断
- 同じfileを複数agentが編集する作業
- destructive commandや外部公開を伴う作業
- task目的を増やす作業

### risk別workflow

小さいdocs変更:

- 対象taskと関連文書だけ読む
- `git diff --check` を確認する
- PR本文は変更範囲と未確認事項を短く書く

通常の実装変更:

- task、関連ADR / specs、該当code、該当testを読む
- 変更前に失敗testまたは既存testの確認方法を決める
- `pnpm run check` と必要なtestを実行する

境界、security、互換性、外部CLI、Webview、path、undo、安全性に関わる変更:

- 名前付き境界を作るか確認する
- 入力、出力、throw、秘匿、fallback、失敗時保証を明示する
- malformed / hostile input testは `unknown` や外部messageなど必要な境界に限定する
- Lunaへ読み取りreviewを委譲してもよい

### Git操作の範囲

- branch作成: clean worktree、起点branch、task IDを確認してから行う
- commit: taskの変更範囲、`git diff --check`、必要な確認結果を確認し、ユーザーまたはtaskが求める場合だけ行う
- push: `next/v1`へ直接pushせず、作業branchだけをpushする
- PR: baseを `next/v1` にし、PR titleは英語のConventional Commit形式にする
- PR review commentへの返信、resolve、review submitはskillの自動手順に含めない

### 情報の残し方

- production code: How
- test: What
- commit / PR / ADR: Why
- code comment: Why not

ただし、この役割分担は絶対ルールではなく、読者が必要な情報を最小の場所で得るための指針とする。docs/tasksとADRは日本語、commit messageとPR titleはConventional Commit / 英語方針に従う。
