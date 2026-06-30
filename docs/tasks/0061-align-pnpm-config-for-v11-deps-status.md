# タスク: pnpm 11向けに設定置き場とdeps status checkを整理する

## Status

Done

## 目的

pnpm 11.8.0で`pnpm run ...`前に`node_modules`再作成へ入りやすい状態を避けるため、pnpm設定の置き場と`verify-deps-before-run`の扱いを整理する。

## 背景

0060で、以下を確認した。

- pnpm 11.8.0では`pnpm run ...`前にdeps status checkが走る。
- 依存状態が古いと判断されると、script前に内部で`pnpm install`が走る。
- `node_modules`の状態が壊れていると`Recreating .../node_modules`へ入り、ネットワーク制限下では失敗する。
- project `.npmrc`に書いた`node-linker=hoisted`などのpnpm設定は、現在のpnpm 11.8.0実行では効いていない。
- `pnpm config set --location project ...`は、既存の`pnpm-workspace.yaml`へcamelCaseの設定を書き込む。

## やること

- pnpm 11で有効な設定置き場を確認する
- `.npmrc`に残すべき設定と`pnpm-workspace.yaml`へ移すべき設定を分ける
- `verify-deps-before-run`を有効のままにするか、明示的に無効化するか判断する
- 判断内容をdocsに残す
- 必要なら設定を最小変更する

## 完了条件

- `pnpm config get`または同等の方法で、意図した設定が実際に有効であることを確認する
- `CI=true pnpm install --frozen-lockfile`後に`CI=true pnpm run check`が`node_modules`再作成なしで成功する
- 設定変更をした場合、その理由をタスク内に記録する

## 変更可能なファイル

- `.npmrc`
- `pnpm-workspace.yaml`
- `docs/tasks/0061-align-pnpm-config-for-v11-deps-status.md`
- `docs/tasks/README.md`
- 必要なら関連docs

## 対象外

- dependency更新
- lockfile更新
- lefthookの挙動変更

## 実施内容

### 設定置き場

`.npmrc`に書かれていたpnpm設定を、pnpm 11.8.0がproject設定として認識する`pnpm-workspace.yaml`へ移した。

`pnpm config set --location project ...`で確認した保存形式に合わせ、以下のようなcamelCaseキーにした。

- `package-manager-strict` → `packageManagerStrict`
- `engine-strict` → `engineStrict`
- `node-linker` → `nodeLinker`
- `auto-install-peers` → `autoInstallPeers`
- `strict-peer-dependencies` → `strictPeerDependencies`
- `verify-deps-before-run` → `verifyDepsBeforeRun`
- `minimum-release-age` → `minimumReleaseAge`

`.npmrc`は空になるため削除した。

### `verifyDepsBeforeRun`

`verifyDepsBeforeRun`は`false`にした。

理由は、今回の問題がscript実行前のdeps status checkから内部`install`へ進むことで発生していたため。開発中の`pnpm run check` / `pnpm run test`で暗黙にinstallへ入るより、依存状態を更新したい時は明示的に`pnpm install --frozen-lockfile`を実行する方が安全。

### 確認結果

設定変更後、以下を確認した。

- `pnpm config get --location project node-linker` → `hoisted`
- `pnpm config get --location project verify-deps-before-run` → `false`
- `pnpm config get --location project minimum-release-age` → `1440`
- `pnpm config get --location project package-manager-strict` → `true`
- `pnpm config get --location project engine-strict` → `true`
- `CI=true pnpm install --frozen-lockfile` → 成功
- `CI=true pnpm run check` → 成功

`CI=true pnpm run check`では`Recreating .../node_modules`は出なかった。
