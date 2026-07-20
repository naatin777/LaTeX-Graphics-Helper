# タスク: VSIXのproduction dependency同梱とplatform packageを成立させる

## Status

Todo

## 再開理由

- package managerをnpmへ統一し、rootの通常の`npm ci`とローカルVSCE entrypointでproduction dependencyを同梱できるか再確認する
- VSCEはpnpmの依存treeを正式にサポートしないため、pnpmと旧staging方式を廃止する

## 目的

npmで管理しているproduction dependencyをVSIXへ確実に同梱し、`sharp`などのnative dependencyを対象OS / architectureで実行できる配布方式を決めて実装する。

## 完了条件

- cleanな環境でproduction dependencyを含むVSIXを生成できる
- `--no-dependencies`に依存しない
- `sharp`のnative packageを対象platformに合わせて同梱できる
- Linux、macOS、Windowsの対象platformと生成方式を記録する
- `.vscodeignore`に不要なdocs / test / AI開発ファイルを同梱しない方針を決め、必要なら整理する
- release workflowで使う生成コマンドを決める

## これまでの実装

- `scripts/package-vsix.mjs`を追加し、root packageからローカルVSCEのNode entrypointを実行する方式にした
- `package:vsix`を追加し、`package`からplatform-specific VSIX生成を呼び出すようにした
- release workflowをLinux、macOS、Windowsのmatrix package jobとpublish jobへ分割した
- runnerのOS / architectureからVSIX targetを決め、`sharp`のnative packageを同じrunnerで同梱するようにした
- `.vscodeignore`でdocs、test、source、AI開発設定、source map、開発用Draw.io assetを除外するようにした
- [ADR-0015](../adr/0015-build-platform-specific-vsix-from-runtime-staging.md)と[調査メモ](../research/2026-07-15-vsix-runtime-staging-result.md)へ方式と確認結果を記録した

## 変更可能なファイル

- `package.json`
- `package-lock.json`
- `scripts/package-vsix.mjs`
- `.vscodeignore`
- `.github/workflows/release.yml`
- `docs/tasks/0179-fix-vsix-production-dependency-packaging.md`
- `docs/tasks/README.md`
- 必要な`docs/research/`
- 必要な`docs/adr/`

## 対象外

- release tagの作成・公開
- VSIXをnetwork遮断下で実行する3 OS smoke test
- 外部CLIそのもののinstall方法変更
- 変換機能やWebview実装の変更

## 関連

- [0162: パッケージ済みVSIXのオフライン・3 OS動作を調査する](0162-audit-offline-vsix-cross-platform.md)
- [0180: パッケージ済みVSIXのオフライン3 OS smoke testを追加する](0180-add-packaged-vsix-offline-smoke-tests.md)

## 確認方法

- cleanなproduction dependency環境でVSIXを生成する
- VSIX内にruntime dependencyと対象platformのnative binaryがあることを確認する
- `npm run check`
- release workflowのdry-run相当を確認する
- `git diff --check`

## 実施した確認

- `node --check scripts/package-vsix.mjs`
- `npx --no-install oxfmt --check scripts/package-vsix.mjs package.json`
- `npm run package:vsix -- --target darwin-arm64 --out /tmp/lgh-darwin-arm64-script.vsix`
- 生成VSIXのmanifest、target、runtime dependency、sharp native binary、不要なdevelopment/repository filesを`unzip -l`で確認した

Linux、Windowsの実VSIX生成とnetwork遮断下での起動・機能確認は、タスク0180の対象とする。
