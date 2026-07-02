# タスク: vscode-testをshard並列実行できるか検証する

## Status

Done

## 検証結果

採用しない。

理由:

- GitHub ActionsのLinuxでは、片方のshardだけ失敗する状態になった
- GitHub ActionsのWindowsでは、shard process起動時に `spawn EINVAL` が発生した
- VS Code integration testはworkspace / user-data-dir / extensions-dir / Extension Hostが絡むため、単純なprocess分割の安定化コストが高い
- `actions/setup-node` / `pnpm/action-setup` / `pnpm install --frozen-lockfile` の重さは、このshard分割では解決しない

次にCI時間を改善する場合は、GitHub Actionsのdependency setup重複を調査する別タスクで扱う。

## 目的

`test:vscode` が長いため、1つのExtension Host内でMocha並列化するのではなく、複数の `vscode-test` プロセスへshard分割して並列実行できるか検証する。

## 完了条件

- `convert` と `non-convert` の2 shardを並列実行するscriptを追加する
- shardごとに `user-data-dir` / `extensions-dir` / workspace copy を分ける
- 既存の `test:vscode` は維持し、実験用scriptとして追加する
- GitHub ActionsのVS Code test workflowではsharded scriptを使う
- ローカルでsharded実行が通るか確認する

## 変更可能なファイル

- `.vscode-test.mjs`
- `package.json`
- `scripts/run-vscode-test-shards.mjs`
- `.github/workflows/test-linux.yml`
- `.github/workflows/test-macos.yml`
- `.github/workflows/test-windows.yml`
- `docs/tasks/README.md`
- `docs/tasks/0079-vscode-test-sharding.md`

## 対象外

- Mochaの同一Extension Host内parallel実行
- テスト内容の分類変更・移動
- `test:vscode` の置き換え

## 確認方法

- `CI=true pnpm run test:vscode:sharded`
- `CI=true pnpm run check`
