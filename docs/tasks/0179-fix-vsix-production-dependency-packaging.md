# タスク: VSIXのproduction dependency同梱とplatform packageを成立させる

## Status

Todo

## 目的

pnpmで管理しているproduction dependencyをVSIXへ確実に同梱し、`sharp`などのnative dependencyを対象OS / architectureで実行できる配布方式を決めて実装する。

## 完了条件

- cleanな環境でproduction dependencyを含むVSIXを生成できる
- `--no-dependencies`に依存しない
- `sharp`のnative packageを対象platformに合わせて同梱できる
- Linux、macOS、Windowsの対象platformと生成方式を記録する
- `.vscodeignore`に不要なdocs / test / AI開発ファイルを同梱しない方針を決め、必要なら整理する
- release workflowで使う生成コマンドを決める

## 変更可能なファイル

- `package.json`
- `pnpm-lock.yaml`
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
- `pnpm run check`
- release workflowのdry-run相当を確認する
- `git diff --check`
