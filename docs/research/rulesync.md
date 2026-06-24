# RuleSync調査メモ

## 調査日

2026-06-23

## 対象

- RuleSync
- 公式repositoryで確認したversion: `8.31.0`

実際に導入するversionは、0033の実施時にnpm registryと公式release情報を再確認して固定する。

## 公式情報源

- Repository: https://github.com/dyoshikawa/rulesync
- Documentation: https://dyoshikawa.github.io/rulesync/
- npm: https://www.npmjs.com/package/rulesync
- Quick Start: https://dyoshikawa.github.io/rulesync/getting-started/quick-start
- Configuration: https://dyoshikawa.github.io/rulesync/guide/configuration
- Supported Tools: https://dyoshikawa.github.io/rulesync/reference/supported-tools

## 確認できた事実

- RuleSyncは共通のAI rule fileから、各AI開発ツール向けの設定ファイルを生成するNode.js CLIである
- `rulesync.jsonc`で生成対象と機能を設定できる
- `rulesync init`で初期構成を作成できる
- `rulesync import`で既存の`CLAUDE.md`、`.cursorrules`、Copilot instructionsなどを`.rulesync/`へ取り込める
- `rulesync generate`で対象ツール向けの設定を生成できる
- rules機能はCodex CLI、Claude Code、Cursor、GitHub Copilotに対応している
- `AGENTS.md`形式も生成対象として対応している
- target名として、少なくとも`codexcli`、`claudecode`、`cursor`、`copilot`、`agentsmd`が使用される
- `rulesync.local.jsonc`でローカル設定を上書きでき、Git管理対象外として扱う想定がある
- 複数targetが同じファイルへ出力する場合は、設定順の後ろにあるtargetが優先される
- RuleSync `8.31.0`のpackage情報ではNode.js `>=22.0.0`、pnpm `>=10`が指定されている

## このプロジェクトへの適用案

- `.rulesync/`をAI作業ルールの意味の正本にする
- 現在の`AGENTS.md`を移行元にする
- 最初はrules機能だけを対象とする
- 初期targetはCodex CLI、Claude Code、Cursor、GitHub Copilotとする
- `AGENTS.md`もRuleSyncから再生成可能にする
- MCP、skills、subagents、commandsの同期は初期導入へ含めない
- RuleSyncをdevDependencyとしてversion固定する
- package scriptから生成と同期確認を実行できるようにする

## 注意点

- RuleSync導入後は`AGENTS.md`を直接編集すると正本と不整合になる可能性がある
- 既存のADR-0001は`AGENTS.md`を正本としているため更新が必要である
- 生成されたファイルをGit管理するかは、導入時に決定する必要がある
- targetの組み合わせによって同じ`AGENTS.md`を上書きする可能性があるため、target順を確認する必要がある
- 最新versionではCLI option、生成先、target名、出力形式が変わる可能性がある

## 未確認事項

- このリポジトリに最適な`.rulesync/`内のrule file分割方法
- 生成物をGit管理した場合の推奨同期確認command
- Codex、Claude Code、Cursor、Copilotを同時指定した場合の正確な生成ファイル一覧
- 既存`AGENTS.md`を直接importする最適なtargetと手順
- RuleSync生成物を`.gitattributes`でgenerated扱いにする必要があるか

## 再確認する条件

- 0033を実施するとき
- RuleSyncの導入versionが`8.31.0`と異なるとき
- targetまたはrules以外の機能を追加するとき
- 生成ファイル名やCLI optionが調査内容と一致しないとき
- RuleSyncのmajor versionを更新するとき

## 関連

- `docs/tasks/0033-adopt-rulesync-for-ai-rules.md`
- `docs/adr/0001-use-agents-md-for-codex-rules.md`
- `AGENTS.md`
