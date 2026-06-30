# タスク: pnpm実行時にnode_modulesが再作成される問題を調査する

## Status

Done

## 目的

`pnpm run check`や`pnpm run test`の実行時に、`node_modules`が再作成されようとしてネットワーク制限で失敗する原因を切り分ける。

## 背景

作業中に以下の挙動が何度も発生した。

- `pnpm run check` / `pnpm run test` 実行時に `Recreating .../node_modules` が出る
- sandbox内ではnpm registryへ到達できず `ENOTFOUND` で失敗する
- `CI=true pnpm install --frozen-lockfile` をネットワーク許可付きで実行すると復旧する

## 完了条件

- なぜ`pnpm run check` / `pnpm run test`のたびに`node_modules`再作成へ入るのか確認する
- `pnpm install --frozen-lockfile`後に再発する条件を確認する
- lefthook / pnpmのdeps status check / lockfile / node_modules stateのどこが原因か切り分ける
- 原因メモを残す
- 修正が必要な場合は別タスク化する

## 変更可能なファイル

- `docs/tasks/0060-investigate-pnpm-node-modules-recreation.md`
- `docs/tasks/README.md`
- 必要なら調査メモ用のdocs

## 対象外

- 設定修正
- dependency変更
- lockfile更新
- hooks変更

## 確認方法

- `pnpm run check`
- 必要なら `pnpm run test`

## 調査メモ

### 結論

`pnpm run check`や`pnpm run test`そのものが`node_modules`を再作成しているのではなく、pnpm 11.8.0の`verify-deps-before-run`による依存状態チェックが、script実行前に`pnpm install`を内部実行していた。

その`install`が既存の`node_modules`を再利用できない状態だと判断すると、`Recreating .../node_modules`に入る。

一度この処理がネットワーク制限などで途中失敗すると、`node_modules/.modules.yaml`や`node_modules/.pnpm-workspace-state-v1.json`が欠けた状態になり、次の`pnpm run ...`でも再び依存状態チェックから`install`へ入りやすくなる。

### 確認したこと

- pnpm 11.8.0の既定値では`verify-deps-before-run`が`install`になっている。
- `pnpm run ...`はscript実行前に`runDepsStatusCheck`を呼び、依存状態が古いと判断すると`pnpm install`を内部実行する。
- `Recreating .../node_modules`はpnpmのinstall処理がmodules directoryの再作成を選んだ時に出る。
- 失敗後には`node_modules/.modules.yaml`が存在しない状態を確認した。
- `CI=true pnpm install --frozen-lockfile`で復旧した後は、`CI=true pnpm run typecheck`と`CI=true pnpm run check`が再作成なしで成功した。

### `.npmrc`について

現在の`.npmrc`には以下のようなpnpm設定がある。

```ini
node-linker=hoisted
auto-install-peers=true
strict-peer-dependencies=true
verify-deps-before-run=true
minimum-release-age=1440
```

しかし、pnpm 11.8.0で確認したところ、`pnpm config get node-linker`、`pnpm config get verify-deps-before-run`、`pnpm config get minimum-release-age`はいずれも`undefined`だった。

pnpm 11.8.0の実装上、project `.npmrc`から読み込む対象は主にauth / registry / network系に制限されており、通常のpnpm設定は`pnpm-workspace.yaml`側へ置く想定に見える。

実際に復旧後の`node_modules/.pnpm-workspace-state-v1.json`では、`nodeLinker`は`isolated`として保存されていた。つまり、`.npmrc`に書いた`node-linker=hoisted`は現在のpnpm実行には効いていない。

### lefthookとの関係

lefthook自体が直接`node_modules`を再作成しているわけではない。

ただしlefthookから`pnpm run ...`や`pnpm exec ...`を呼ぶ場合も、pnpm側の依存状態チェックの影響を受ける可能性がある。

### 再発条件

確認できた再発条件は以下。

- `node_modules`のworkspace stateが欠けている、または古い
- `package.json` / `pnpm-lock.yaml` / pnpm設定などが、最後にinstallされた時点から変わっている
- `pnpm run ...`実行時にpnpmのdeps status checkがそれを検知する
- `verify-deps-before-run`の挙動により、script前に`pnpm install`が走る
- sandbox内などネットワーク不可の環境で追加fetchが必要になると失敗する

### 修正方針

設定修正はこのタスクでは行わない。

次タスクとして、pnpm 11向けに設定置き場とdeps status checkの扱いを整理する。
