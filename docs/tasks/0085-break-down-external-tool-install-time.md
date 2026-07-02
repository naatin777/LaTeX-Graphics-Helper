# タスク: 外部ツールinstall時間をOS別に分解する

## Status

Done

## 目的

GitHub Actionsのvscode-test workflowで実行している外部変換ツールinstallがCI時間に影響しているため、OS別・ツール別にどこが重いか分かる状態にする。

## 背景

直近のCI高速化調査では、以下を確認した。

- `check.yml` のCorepack化は効果があった
- Corepack方式の全workflow展開は、macOSなどで悪化したため採用しなかった
- Playwright browser cacheは、cache restore/saveやOS dependencyの不確実性があるため現時点では採用しなかった
- GitHub Actions parallel stepsは、順序依存があるsetup/installには効きにくい

次に改善対象を選ぶには、外部ツールinstallの内訳を測る必要がある。

対象workflow:

- `.github/workflows/test-linux.yml`
- `.github/workflows/test-macos.yml`
- `.github/workflows/test-windows.yml`

対象script:

- `.github/scripts/install-test-tools-linux.sh`
- `.github/scripts/install-image-tools-macos.sh`
- `.github/scripts/install-image-tools-windows.ps1`
- `.github/scripts/verify-image-tools-unix.sh`
- `.github/scripts/verify-image-tools-windows.ps1`

## 完了条件

- Linux / macOS / Windowsそれぞれで、外部ツールinstall stepの内訳がCIログから分かる
- Ghostscript / Poppler / rsvg / Chrome設定など、分けられる単位で時間を記録する
- 実測結果をこのタスクに追記する
- 改善候補を次タスクとして切り出す

## 変更可能なファイル

- `.github/scripts/install-test-tools-linux.sh`
- `.github/scripts/install-image-tools-macos.sh`
- `.github/scripts/install-image-tools-windows.ps1`
- `.github/scripts/verify-image-tools-unix.sh`
- `.github/scripts/verify-image-tools-windows.ps1`
- `.github/workflows/test-linux.yml`
- `.github/workflows/test-macos.yml`
- `.github/workflows/test-windows.yml`
- `docs/tasks/README.md`
- `docs/tasks/0085-break-down-external-tool-install-time.md`

## 対象外

- install処理の高速化
- cache導入
- parallel steps導入
- 外部ツールのversion変更
- test内容の変更

## 注意

- まずは計測だけを行う。
- 高速化は、重い箇所が分かってから別タスクで行う。
- ログが読みにくくなりすぎる場合は、GitHub Actionsのgroup logを使う。

## 確認方法

- PR上の GitHub Actions `vscode-test` jobs

## 実測結果

計測対象PR:

- #294 `ci: add external tool install timing`
- 実行日時: 2026-07-02

### Linux

workflow:

- `Test (Linux)` / `vscode-test`
- job時間: 1m25s

install / verify内訳:

- `apt-get update`: 7s
- `install Ghostscript / Poppler / rsvg / xvfb`: 6s
- `write VS Code settings`: 0s
- `rsvg-convert SVG to PDF smoke test`: 0s
- `pdftocairo PDF to PNG smoke test`: 0s

### macOS

workflow:

- `Test (macOS)` / `vscode-test`
- job時間: 2m35s

install / verify内訳:

- `brew install Poppler / rsvg / Ghostscript`: 32s
- `write VS Code settings`: 0s
- `rsvg-convert SVG to PDF smoke test`: 0s
- `pdftocairo PDF to PNG smoke test`: 0s

### Windows

workflow:

- `Test (Windows)` / `vscode-test`
- job時間: 2m24s

install / verify内訳:

- `download Poppler`: 0.7s
- `extract Poppler`: 1.5s
- `download rsvg-convert`: 0.3s
- `download Ghostscript`: 0.4s
- `extract Ghostscript`: 2.4s
- `write VS Code settings`: 0.0s
- `rsvg-convert SVG to PDF smoke test`: 0.0s
- `pdftocairo PDF to PNG smoke test`: 0.0s

## 分かったこと

- 外部ツールinstallだけを見ると、macOSのHomebrew installが最も重い。
- Windowsはダウンロードと展開を分けた結果、Ghostscript展開とPoppler展開が主な時間になっている。
- Linuxは`apt-get update`とinstallが同程度で、どちらか一方だけが極端に重い状態ではない。
- smoke test自体は全OSでほぼ無視できる時間だった。

## 次タスク候補

- [0086: macOSの外部ツールinstall時間を削減する](0086-reduce-macos-external-tool-install-time.md)
