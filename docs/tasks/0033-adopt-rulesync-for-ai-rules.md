# タスク: RuleSyncでAI作業ルールを一元管理する

## Status

Done

## 目的

Codex、Claude Code、Cursor、GitHub Copilotなど複数のAI開発ツールで、同じプロジェクトルールを一貫して使用できるようにする。

RuleSyncの共通rule fileを意味の正本とし、各AIツール固有の設定ファイルを生成する運用へ移行する。

また、lintやformatの軽微な問題をAIが個別に手修正してコンテキストを消費しないように、既存の自動修正commandを優先するルールを追加する。

## 背景

- 今後複数のAI開発ツールを使用する予定がある
- `AGENTS.md`だけでは、参照しないAIツールへ同じルールを適用できない
- AIツールごとに同じルールを手作業で複製すると不整合が起きる
- このリポジトリには`pnpm run lint:fix`、`pnpm run format:fix`、`pnpm run check:fix`が既にある
- 自動修正可能な問題をAIが1件ずつ考えて修正すると、作業時間とコンテキストを浪費する

## 決定すること

- `.rulesync/`をAI作業ルールの意味の正本にする
- 最初の生成対象をCodex CLI、Claude Code、Cursor、GitHub Copilotとする
- `AGENTS.md`をRuleSyncの生成物として扱う
- RuleSyncをdevDependencyへバージョン固定で追加する
- `rulesync.jsonc`をリポジトリへ追加する
- 生成用と生成差分確認用のpackage scriptを追加する
- 生成されたAIツール固有ファイルをGit管理するか決める
- RuleSyncのversion更新を通常のdependency更新として扱う

## 移行方針

1. 現在の`AGENTS.md`をRuleSyncの共通rule fileへ移す
2. RuleSyncから`AGENTS.md`を生成する
3. 移行前後でルールの意味が失われていないことを比較する
4. Claude Code、Cursor、GitHub Copilot向けのrule fileを生成する
5. 生成物を各ツールが実際に読み取れる場所へ出力する
6. ADR-0001を更新し、`AGENTS.md`単独管理からRuleSync正本管理へ変更した理由を記録する

移行中に既存ルールの意味を変更しない。ルール内容の整理や短縮は別タスクとする。

## 外部調査の記録ルール

共通rule fileへ以下の方針を追加する。

- 外部仕様、dependency、CLI、規格をWebで調査し、実装判断に影響する結果は`docs/research/`へ記録する
- 調査日、対象version、公式情報源、確認できた事実、未確認事項、再確認条件を含める
- 可能な限り公式documentation、公式repository、公式release情報を使用する
- Webページ全体を転記せず、判断を再現するために必要な事実だけを書く
- 推測と確認済みの事実を区別する
- 採用判断はADR、正式仕様はspecへ移し、research noteを正式仕様の代用にしない
- 最新情報が変わる可能性がある場合は、research noteだけを信用せず実装時に公式情報を再確認する

## 自動修正ルール

共通rule fileへ以下の方針を追加する。

- lintまたはformatエラーを手作業で修正する前に、既存の自動修正commandを確認する
- 通常は`pnpm run check:fix`を優先する
- lintだけを修正する場合は`pnpm run lint:fix`を使用する
- formatだけを修正する場合は`pnpm run format:fix`を使用する
- 自動修正の前に`git status --short`で作業ツリーを確認する
- 自動修正後に差分を確認し、現在のタスクと無関係な変更を含めない
- ユーザーまたは別作業の未コミット差分へ自動修正が及ぶ可能性がある場合は、勝手に実行しない
- 自動修正で解消しない問題だけを個別に調査する
- 自動修正commandの設定変更は、単なる警告解消を理由に行わない

## 完了条件

- RuleSyncがdevDependencyとしてバージョン固定で追加されている
- `rulesync.jsonc`と共通rule fileが追加されている
- `docs/research/`の運用ルールとRuleSyncの調査メモが追加されている
- Codex CLI、Claude Code、Cursor、GitHub Copilot向けrule fileを生成できる
- `AGENTS.md`がRuleSyncから再生成できる
- 移行前の`AGENTS.md`のルールが欠落していない
- 自動修正commandを優先するルールが全対象ツールへ反映されている
- RuleSyncの生成commandがpackage scriptとして登録されている
- 生成後に未同期差分を検出できる確認commandがある
- ADR-0001がRuleSync運用に合わせて更新されている
- RuleSync導入以外のdependencyや実装コードを変更していない

## 変更可能なファイル

- `package.json`
- `pnpm-lock.yaml`
- `rulesync.jsonc`
- `.rulesync/`
- `AGENTS.md`
- RuleSyncが生成する各AIツール向けrule file
- `.gitignore`
- `.gitattributes`（生成物として明示する必要がある場合のみ）
- `docs/research/`
- `docs/adr/0001-use-agents-md-for-codex-rules.md`
- 必要な新規`docs/adr/`
- `docs/tasks/README.md`
- `docs/tasks/0033-adopt-rulesync-for-ai-rules.md`

## 対象外

- application実装の変更
- test fileの変更
- MCP、skills、subagents、commandsの同期
- RuleSyncを理由とした既存ルールの全面的な書き直し
- 対象AIツールの無制限な追加
- formatterやlinter設定の変更
- RuleSync以外のdependency追加

## 関連

- `AGENTS.md`
- `docs/adr/0001-use-agents-md-for-codex-rules.md`
- `docs/adr/0005-limit-codex-change-scope.md`
- `docs/research/rulesync.md`
- `package.json`

## 確認方法

- `pnpm install`
- RuleSyncの生成script
- RuleSyncの生成差分確認script
- `pnpm run check:all`
- `git diff --check`
- 生成された各rule fileに主要ルールと自動修正ルールが含まれることを確認する
