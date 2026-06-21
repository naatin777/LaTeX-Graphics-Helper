# タスク: 標準のtestコマンドを決定する

## Status

Done

## 目的

このプロジェクトで標準とするテストコマンドを決定し、`pnpm run test` が未定義の状態を解消するための方針を確定する。

## 完了条件

- `pnpm run test` に割り当てるテスト範囲を決定している
- 既存の `test:vscode`、`test:playwright`、`test:all` との関係を明記している
- コマンドを追加または運用文書だけを変更するか決定している
- 実装を行う場合は、変更後のコマンドを実行して結果を記録している

## 変更可能なファイル

- `package.json`
- `docs/tasks/README.md`
- `docs/tasks/0004-decide-standard-test-command.md`

## 対象外

- テスト失敗の修正
- テストケースの追加
- 依存関係の追加または更新
- 方針を確認せずに `test:all` を標準として採用すること

## 関連

- `docs/tasks/0002-establish-validation-baseline.md`
- `AGENTS.md`

## 確認方法

- 決定した標準コマンドと既存スクリプトの関係を確認する
- 実装した場合は決定したコマンドを実行する

## 決定

`pnpm run test` は `pnpm run test:vscode` を実行する標準コマンドとする。

各コマンドの役割:

- `test`: 通常のVS Code拡張統合テスト
- `test:vscode`: VS Code拡張統合テストの実体
- `test:playwright`: WebviewのPlaywrightテスト
- `test:all`: VS Code拡張統合テストとPlaywrightテストを順番に実行する全体テスト

Playwrightは既存CIで別ワークフローとして実行されるため、標準の `test` には含めない。

WebviewのVitestは設定ファイルのみ存在し、テストファイルと実行スクリプトがないため、今回の標準コマンドには含めない。

## 実行結果

実行日: 2026-06-21

### `pnpm run test`

結果: 成功

- build:test: 成功
- VS Code extension test: 2件成功
  - extension is registered
  - extension activates

サンドボックス内の初回実行はVS Code/Electron起動時に `SIGABRT` となったため、サンドボックス外で再実行してテスト結果を確認した。

### `pnpm run check`

結果: 成功

- lint: エラーなし、既存警告10件
- format: 成功
- extension typecheck: 成功
- webview typecheck: 成功
