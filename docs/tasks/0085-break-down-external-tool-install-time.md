# タスク: 外部ツールinstall時間をOS別に分解する

## Status

In Progress

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
