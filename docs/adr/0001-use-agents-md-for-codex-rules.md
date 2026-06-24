# ADR-0001: AI向け作業ルールをRuleSyncで管理しAGENTS.mdへ生成する

## ステータス

採用

## 日付

2026-06-21

## 背景

Codexへ作業を依頼するたびに、変更範囲や作業方針について同じ注意を伝える必要がある。

注意が不足すると、機能追加とリファクタリングが混ざる、大きな変更が一度に行われる、現在のタスクと無関係なファイルまで変更される、といった問題が起きやすい。

また、メンテナ自身の完璧主義やAIによる過剰な変更を抑え、プロジェクトを完成に近づけるための固定ルールが必要である。

その後、Codex以外のAI開発ツールも使う可能性が高くなった。

`AGENTS.md`だけを正本にすると、Claude Code、Cursor、GitHub Copilotなどへ同じルールを反映するときに手作業の複製が必要になる。

## 決定

AI向けのプロジェクト固有作業ルールは、RuleSyncの `.rulesync/` を意味の正本として管理する。

`AGENTS.md` はRuleSyncから生成する。

AIツールのStop時にlint/formatの自動修正を走らせるhookも、RuleSyncで管理する。

Stop hookは、各AIツールのhook設定へ `pnpm run lint:fix` や `pnpm run format:fix` を直接書かず、`.rulesync/hooks/stop-fix.sh` を呼び出す。

`.rulesync/hooks/stop-fix.sh` は `pnpm run check:fix` を実行する。

つまり、RuleSyncのhook定義は「どのタイミングで何を呼ぶか」だけを持ち、実際に実行するshell commandの詳細は `.sh` に閉じ込める。

初期生成対象は以下とする。

- Codex CLI
- Claude Code
- Cursor
- GitHub Copilot

## 理由

- Codexへ毎回同じ注意を伝える必要がなくなる
- 「大きな変更をしない」「機能追加とリファクタリングを混ぜない」などの方針を固定できる
- メンテナ自身の完璧主義による脱線を抑えられる
- AIが依頼範囲を超えて変更するリスクを下げられる
- 複数AIツールへ同じルールを配布できる
- ルールの正本を1か所に集約できる
- Stop hookの実行入口をshell scriptに寄せることで、各AIツールのhook設定にshell commandの細部を重複させずに済む
- `check:fix`を呼ぶことで、lint/formatの実体は`package.json`の既存scriptに集約できる
- 今後lint/formatの対象や順序を変える場合も、hook設定を複数箇所変更せずに済む
- RuleSyncはtargetごとに異なるhook設定ファイルを生成するため、直接commandを書くと生成物ごとのquote、escape、shell解釈の差分を確認する必要が出る
- `.sh`に寄せると、各AIツールの生成物は同じscript pathを呼ぶだけになり、実行内容の確認場所を1つにできる
- `lint:fix`と`format:fix`を個別にhookへ書くのではなく`check:fix`を呼ぶことで、hookの責務を「自動修正入口の起動」に限定できる

## 代替案

### 依頼ごとにルールを伝える

メリット:

- タスクに合わせて細かく指示できる

デメリット:

- 毎回同じ説明が必要になる
- 指示漏れや表現の揺れが起きる

### AGENTS.mdだけを正本にする

メリット:

- Codex向けには単純
- 追加のdependencyが不要

デメリット:

- Codex以外のAIツールへ同じルールを反映しづらい
- 複数ファイルへ手作業で複製すると不整合が起きやすい

### ルールを各ドキュメントへ分散して書く

メリット:

- 各ドキュメントの目的に合わせてルールを配置できる

デメリット:

- Codexが作業前に確認すべき場所が増える
- ルールの重複や不整合が起きやすい

### hook設定にpnpm commandを直接書く

メリット:

- hook設定だけを見れば実行内容が分かる
- shell scriptファイルを追加しなくてよい

デメリット:

- 複数AIツールのhook設定に同じcommandが重複する
- quote、shell解釈、targetごとの出力形式の差を各生成物で意識する必要がある
- lint/formatの実行内容を変えるときに、hook設定側まで変更が波及しやすい

## 結果・影響

- Codexは作業前に `AGENTS.md` のルールを確認する
- プロジェクト共通の作業方針を変更するときは `.rulesync/` を更新し、RuleSyncで生成する
- タスク固有の指示は `docs/tasks/*.md` に書き、共通ルールと分離する
- ルールを維持する手間は増えるが、変更範囲を把握しやすくなる
- RuleSync自体はdevDependencyとして固定versionで管理する
- 生成された各AIツール向けファイルはGit管理する
- Stop hookにより、AI作業終了時に `pnpm run check:fix` が実行される
- hookで実行する自動修正の内容は、hook設定ではなく`package.json`の`check:fix`で管理する

## 運用ルール

- 作業前に `PROJECT_STATE.md`、`docs/tasks/README.md`、現在のタスクを読む
- 1タスク1目的にする
- 無関係なファイルを変更しない
- 機能追加とリファクタリングを混ぜない
- 仕様変更、依存追加、ディレクトリ構成やアーキテクチャの変更は、実施前に理由と影響を説明する
- lintやformatの軽微な問題は、手修正より先に既存の自動修正commandを確認する
- 外部仕様、dependency、CLI、規格をWebで調査し、実装判断に影響する場合は`docs/research/`へ記録する

## 見直す条件

- RuleSyncがメンテナンスされなくなったとき
- 利用するAIツールがRuleSyncの生成対象から外れたとき
- `.rulesync/` が大きくなり、作業ルールを正確に把握しづらくなったとき

## 関連

- `AGENTS.md`
- `.rulesync/`
- `rulesync.jsonc`
- `PROJECT_STATE.md`
- `docs/tasks/README.md`
- `docs/adr/0005-limit-codex-change-scope.md`
