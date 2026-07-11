# タスク: GitHub Actionsの3 OSへqpdfを導入する

## Status

Done

## 目的

将来のPDF検証・変換バックエンド候補であるqpdfを、GitHub ActionsのLinux、macOS、Windowsへ導入し、各OSで実体を起動できる状態にする。

## 完了条件

- Linux CIでUbuntuの`qpdf` packageを導入する
- macOS CIでHomebrewの`qpdf` formulaを導入する
- Windows CIでqpdf公式の固定version配布物をSHA-256検証後に展開する
- 3 OSすべてで実体の`qpdf --version`を実行する
- 未使用のextension設定やdependencyを追加しない

## 変更可能なファイル

- `.github/scripts/install-test-tools-linux.sh`
- `.github/scripts/install-image-tools-macos.sh`
- `.github/scripts/install-image-tools-windows.ps1`
- `.github/scripts/verify-image-tools-unix.sh`
- `.github/scripts/verify-image-tools-windows.ps1`
- `docs/research/2026-07-11-qpdf-ci-installation.md`
- `docs/tasks/README.md`
- `docs/tasks/0140-install-qpdf-in-ci.md`
- `docs/tasks/0141-audit-external-tool-path-compatibility.md`
- `docs/tasks/0142-design-ascii-staging-for-external-tools.md`

## 対象外

- extensionからqpdfを実行する機能
- `latex-graphics-helper.execPath.qpdf`設定の公開
- PDF処理バックエンドの採用決定
- 外部コマンドのUnicode path互換性調査

## 関連

- [PDF処理バックエンドを比較評価する](0127-evaluate-pdf-processing-backends.md)
- [qpdfのCI導入調査](../research/2026-07-11-qpdf-ci-installation.md)

## 確認方法

- `qpdf --version`
- `bash -n .github/scripts/install-test-tools-linux.sh`
- `bash -n .github/scripts/install-image-tools-macos.sh`
- `bash -n .github/scripts/verify-image-tools-unix.sh`
- `CI=true pnpm run check:all`
- GitHub ActionsのLinux、macOS、Windows job

## 確認結果

- 手元のqpdf 12.3.2で`qpdf --version`が成功した
- Unix用3 scriptの`bash -n`が成功した
- `CI=true pnpm run check:all`が成功した
- Windows用PowerShell scriptは手元に`pwsh`がないため、GitHub Actionsで実行確認する
