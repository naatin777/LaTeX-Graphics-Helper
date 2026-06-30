# タスク: pnpm 11向けに設定置き場とdeps status checkを整理する

## Status

Todo

## 目的

pnpm 11.8.0で`pnpm run ...`前に`node_modules`再作成へ入りやすい状態を避けるため、pnpm設定の置き場と`verify-deps-before-run`の扱いを整理する。

## 背景

0060で、以下を確認した。

- pnpm 11.8.0では`pnpm run ...`前にdeps status checkが走る。
- 依存状態が古いと判断されると、script前に内部で`pnpm install`が走る。
- `node_modules`の状態が壊れていると`Recreating .../node_modules`へ入り、ネットワーク制限下では失敗する。
- project `.npmrc`に書いた`node-linker=hoisted`などのpnpm設定は、現在のpnpm 11.8.0実行では効いていない。
- 復旧後のworkspace stateでは`nodeLinker: "isolated"`として保存されていた。

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
- 必要なら関連docs

## 対象外

- dependency更新
- lockfile更新
- lefthookの挙動変更
