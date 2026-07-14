# タスク: worktreeを使う並列作業の運用を設計する

## Status

Done

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

## 実施結果

- Codex公式manualのworktree / subagent / approval仕様を確認した
- このprojectでは、Current Taskを1つに保ったまま、親taskから切り出せる独立subtaskだけをworktree対象にする方針にした
- worktreeを使う条件、使わない条件、parent taskとsubtaskの関係、file ownership、統合担当の責任を定義した
- branch名とworktree配置は、Codex-managed worktreeと手動Git worktreeを分けて扱う方針にした
- `docs/tasks/README.md`、RuleSync生成物、共有設定、PR作成は統合担当だけが更新する方針にした
- worktree側agentのhandoffに含める情報と、並列実行時に分離するlocal resourceを定義した
- 失敗、中断、競合、古いworktree / branchの整理方針を定義した
- 自動化はまだ必要なしと判断し、別実装タスクは作成しなかった

## 公式確認

確認日: 2026-07-15

- Codex Manual: Worktrees
  - Source: <https://learn.chatgpt.com/docs/environments/git-worktrees.md>
  - local manual lines: `7124-7295`
- Codex Manual: Subagents
  - Source: <https://learn.chatgpt.com/docs/agent-configuration/subagents.md>
  - local manual lines: `216-540`
- Codex Manual: Agent approvals & security
  - Source: <https://learn.chatgpt.com/docs/agent-approvals-security.md>
  - local manual lines: `1903-2145`

確認できたこと:

- Codex-managed worktreeはChatGPT desktop appのCodexで使う機能で、Git repositoryが必要
- Codex-managed worktreeは通常 `$CODEX_HOME/worktrees` に作られ、開始branchの `HEAD` commitからdetached HEADで始まる
- 同じbranchを複数worktreeで同時checkoutすることはGit側の制約でできない
- HandoffはLocalとWorktreeの間でtaskとcodeを移動するためのCodex側の操作である
- subagentは読み取り中心の探索、test/log分析、triage、summarizationに向く
- 書き込みを並列化する場合は、ownershipと統合責任を明確にし、同じfileを複数agentが編集しない必要がある
- subagentは親taskのsandbox / approval policyを継承する

## 運用方針

### 基本形

このprojectの既定は、1つのCurrent Taskと1つの統合担当を維持する。

worktreeは「Current Taskを増やす手段」ではなく、親taskから切り出した独立subtaskを隔離して進める手段として使う。

統合担当はLocal checkoutで以下を持つ。

- task目的と非対象の最終判断
- file ownershipの割り当て
- 共有file更新
- 差分取り込み
- verification
- commit、push、PR作成
- ユーザーへのhandoff

worktree側のagentは、割り当てられたsubtaskとfile ownershipだけを担当する。

### worktreeを使う作業

使ってよい条件:

- 親taskの目的を増やさず、subtaskとして説明できる
- 編集fileが統合担当や他agentと重ならない
- 独立して検証できる
- 失敗した場合にworktreeごと捨てられる
- 生成物や共有fileを触らなくても完結する
- port、VS Code profile、一時directory、出力先、外部commandのscratch領域をworkerごとに分離できる
- agentへ目的、許可file、禁止事項、期待出力を短く渡せる

例:

- 互いに独立したdocs更新
- 既存test failureの原因調査後に切り出せる小さい修正
- 競合しない小さい実装slice
- 実験的なapproach比較
- 大きいlogやCI結果の分析

### worktreeを使わない作業

使わない条件:

- task目的や仕様判断がまだ曖昧
- 同じfileを複数agentが触る可能性が高い
- `docs/tasks/README.md`、ADR、spec、RuleSync生成物、hook、CIなど共有fileの更新が中心
- dependency追加、security、permission、release、GitHub操作が中心
- 手元のGUI、VS Code、OS固有環境、秘密情報、個人設定に依存する
- port、VS Code profile、一時directory、固定出力先、外部command scratch領域を分離できない
- 失敗時に差分を捨てにくい
- agentの出力を統合担当が確認できない

読み取り専用の調査・レビューは、原則としてworktreeを使わずsubagentだけに委譲する。差分を作らない作業にworktreeを増やすと、管理コストだけが増えるため。

緊急修正は原則としてworktreeを使わず、`main`または指定baseから専用branchを作ってLocalで扱う。理由は、base、release、tag、修正範囲、確認結果の責任を曖昧にしないため。

### parent taskとsubtask

parent task:

- `docs/tasks/README.md`上のCurrent Taskまたはユーザーが明示したtask
- task目的、完了条件、変更可能fileを持つ
- 最終的にDoneへ移す単位

subtask:

- parent taskの中で切り出す作業単位
- docs/tasksへ新しいCurrent Taskとして登録しない
- 必要なら一時メモ、agent prompt、PR本文にだけ残す
- parent taskの目的を増やしてはいけない

subtaskがparent taskを超える場合は、worktreeで進めず、新しいdocs taskを作ってユーザーに確認する。

### file ownership

worktreeを使う前に、統合担当がfile ownershipを明示する。

最低限、agent promptへ以下を書く。

- allowed files / directories
- read-only files
- files not to edit
- expected output
- verification to run or not run
- merge owner is the parent Codex task
- local resources to isolate, such as port, VS Code profile, tmp directory, output directory, and external command scratch

同じfileを複数agentへ割り当てない。共有fileは統合担当だけが更新する。

共有fileの例:

- `docs/tasks/README.md`
- `PROJECT_STATE.md`
- `AGENTS.md`
- `.rulesync/`
- `AGENTS.md`などRuleSync生成物
- `.github/`
- `package.json`
- lockfile
- config / hook / skill metadata

### branch名とworktree配置

Codex-managed worktree:

- ChatGPT desktop appのWorktree機能を使う
- 通常は `$CODEX_HOME/worktrees` 配下でCodexが管理する
- detached HEADから始まる前提で扱う
- 必要になった時点で「Create branch here」またはHandoffを使う

手動Git worktree:

- まだ標準運用にしない
- 使う場合は別taskで設計する
- branch名は `task/<task-id>-<short-topic>` を基本にする
- 配置候補はrepository外の固定領域、例: `../.worktrees/LaTeX-Graphics-Helper/<task-id>/<worker-name>`
- `next/v1`へ直接pushしない

同じbranchをLocalとworktreeで同時checkoutしない。Localで確認したい場合はHandoffを使うか、worktree側を別branch / detached HEADへ戻す。

### worktree側agentのhandoff

worktree側agentは、作業完了時に以下を返す。

- 担当subtask
- 変更file
- commit hash
- 未commit差分の有無
- 実行した確認command
- 未確認事項
- 統合担当が見るべき注意点

未commit差分が残っている場合、統合担当が確認するまでworktreeやbranchを削除しない。

### 差分の取り込み

統合担当は、worktree側の成果をそのまま信用しない。

取り込み前に確認すること:

- subtaskの目的に合っている
- allowed files以外を触っていない
- parent taskの非対象を破っていない
- generated filesや共有fileを勝手に更新していない
- verification結果が未確認として正しく報告されている

取り込み後に確認すること:

- `git diff --check`
- parent taskの確認方法
- 必要なtargeted test
- PR本文に未確認事項を書く必要があるか

commitは統合担当だけが行う。worktree側agentがcommitを作った場合も、統合担当が差分を確認して採用可否を決める。

### 失敗・中断・競合

失敗:

- worktree側の差分は統合担当が確認するまで採用しない
- 目的外の変更が多い場合は捨てる
- 有用な知見だけparent taskへ要約する

中断:

- 途中成果が必要ならpatchまたは要約を受け取る
- base commit、所有file、commit hash、未commit差分の有無を記録する
- 不要かつcleanならworktreeを破棄対象にする

競合:

- 同じfileで競合した場合、並列作業の設計ミスとして扱う
- 自動mergeに頼らず、統合担当が片方を採用するか再作業にする
- 競合解消自体を別agentへ丸投げしない
- cherry-pickやmergeで仕様、security、公開挙動に関わる競合が出た場合はユーザー確認を求める

### 整理

Codex-managed worktree:

- 不要になったtaskはarchiveし、Codex-managed worktreeの自動整理対象にする
- pinned / in-progress / permanent worktreeは自動削除されない前提で残存を確認する

手動Git worktree:

- 標準運用外。使った場合は `git worktree list` で残存確認する
- branchを削除する前に、PR、commit、未採用差分がないことを確認する
- `git worktree prune` 相当の整理を自動化する場合は別taskにする

## 例での確認

### 通常作業

例: `0161: 変更影響に応じたCI scopeを設計する`

- worktree不要
- docs taskと関連workflowを読む統合担当だけで十分
- 必要ならLunaへ読み取り専用レビューを委譲する

### 隔離実験

例: CI scope判定scriptのprototypeを2案比較する

- worktree可
- 各案を別worktree / 別agentへ割り当てる
- ownershipはprototype fileだけに限定する
- 統合担当が片方を採用し、正式実装taskを別に作る

### 緊急修正

例: release済み機能のWindows path bug

- worktree非推奨
- `main`またはtagから専用branchを切ってLocalで扱う
- release、tag、backportの判断を統合担当が保持する

### 競合する編集

例: 複数agentが `docs/tasks/README.md` を更新したい

- worktree不可
- `docs/tasks/README.md` は統合担当だけが更新する
- subtask agentは「READMEへ追加すべき内容」を要約で返す

## 自動化判断

現時点では自動化しない。

理由:

- まだworktree運用の実使用回数が少ない
- Codex-managed worktreeと手動Git worktreeで前提が違う
- 自動cleanupやbranch削除は破壊的操作になりやすい
- まずはskillとtask本文で運用し、繰り返しが3回以上出たらscript化を検討する
