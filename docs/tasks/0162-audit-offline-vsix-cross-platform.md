# タスク: パッケージ済みVSIXのオフライン・3 OS動作を調査する

## Status

Done

## 目的

開発環境ではなくパッケージ済みVSIXを対象に、拡張機能本体とWebview assetがオフラインで利用でき、OS固有dependencyを含む構成がLinux、macOS、Windowsで成立するか確認する。

## 調査すること

- VSIXへapplication、Webview、PDF.js worker、CMap、standard font、WASMが含まれるか
- オフライン環境でCrop PDF Configureの全ページpreviewが描画できるか
- `sharp`などnative dependencyを1つのOSで作ったVSIXが3 OSで利用できるか
- external CLIを必要とする機能と、拡張機能だけで完結する機能
- release workflowでOS別VSIXが必要か
- install、起動、主要機能、uninstall後にnetwork accessが発生しないか

## 完了条件

- VSIX内容とruntimeのnetwork依存を確認している
- Linux、macOS、Windowsで確認済み・未確認を区別している
- external CLIがない場合の機能境界を記録している
- native dependencyの配布方針を判断できる結果がある
- 問題がある場合は原因ごとの実装タスクへ分けている
- 調査とrelease workflow変更を同じタスクで行っていない

## 変更可能なファイル

- `docs/tasks/0162-audit-offline-vsix-cross-platform.md`
- `docs/tasks/README.md`
- 必要な`docs/research/`
- 必要な`docs/adr/`

## 対象外

- application、test、release workflowの修正
- dependency追加・更新
- releaseとtag作成

## 関連

- [ADR-0013: VS Code ElectronをWebview visual testに使う](../adr/0013-use-vscode-electron-for-webview-visual-tests.md)
- [0155: VS Code WebviewでPDF.jsを安定して読み込む](0155-stabilize-pdfjs-loading-in-vscode-webview.md)

## 確認方法

- packaged VSIXのfile一覧を確認する
- networkを利用できない条件で実VS Codeから起動する
- Linux、macOS、Windowsの結果を比較する
- `git diff --check`

## 実施結果

- 実際にbuildしたVSIXの内容を確認した
- PDF.js worker、CMap、standard fonts、WASMが両Webview appへ含まれることを確認した
- `src`と`webview`のruntime codeに外部URLへのnetwork取得処理がないことを静的確認した
- 通常の`vsce package`がpnpmの依存ツリー検証で失敗することを確認した
- `--no-dependencies`でVSIXは作成できるが、runtime dependencyが同梱されないためrelease artifactには使えないと判断した
- `sharp`がinstall環境のOS / architectureごとのnative packageを選ぶため、単一VSIXを3 OSで共有できる根拠がないと判断した
- macOS arm64について静的なVSIX内容を確認し、Linux / Windowsはパッケージ済みVSIXの実機動作を未確認として記録した
- 依存同梱・platform packageの問題を[0179](0179-fix-vsix-production-dependency-packaging.md)へ分離した
- 3 OSのoffline smoke testを[0180](0180-add-packaged-vsix-offline-smoke-tests.md)へ分離した
- 調査とrelease workflow変更は同じタスクで実施していない

## 調査メモ

- [オフラインVSIXと3 OS配布の調査メモ](../research/2026-07-15-offline-vsix-cross-platform.md)
