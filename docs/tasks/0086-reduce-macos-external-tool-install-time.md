# タスク: macOSの外部ツールinstall時間を削減する

## Status

Todo

## 目的

GitHub Actionsの`Test (macOS)` / `vscode-test`で、外部変換ツールinstallにかかる時間を削減する。

## 背景

0085で外部ツールinstall時間を計測した結果、macOSの`brew install Poppler / rsvg / Ghostscript`が32sで、計測対象の中では最も重かった。

一方で、LinuxとWindowsは外部ツールinstall・verify単体では比較的短かった。

## やること

- macOSで`brew install poppler librsvg ghostscript`が毎回必要か確認する
- GitHub-hosted runnerに既に入っているtoolを使えるか確認する
- Homebrew cacheや事前install済みtoolの利用が安全か検討する
- settings.jsonで明示したexecPathを使う方針は維持する
- 改善案を実装する場合は、CI上の`Test (macOS)` / `vscode-test`で実測する

## 完了条件

- macOSの外部ツールinstall時間を削減する方針が決まっている
- 実装した場合は、PRのCIで改善前後の時間を比較できる
- 方針だけで終える場合は、採用しない理由をこのタスクに記録する

## 変更可能なファイル

- `.github/scripts/install-image-tools-macos.sh`
- `.github/scripts/verify-image-tools-unix.sh`
- `.github/workflows/test-macos.yml`
- `docs/tasks/README.md`
- `docs/tasks/0086-reduce-macos-external-tool-install-time.md`

## 対象外

- Linux / Windowsのinstall高速化
- Playwright browser cache
- pnpm / node_modules cache
- test内容の変更
- 外部ツールversionの不用意な変更

## 注意

- 環境変数だけでpathを注入せず、VS Code test fixtureの`settings.json`にexecPathを書く方針を維持する。
- Homebrew cacheを入れる場合は、cache restore/save自体の時間も含めて評価する。
- GitHub-hosted runnerのpreinstalled toolに依存する場合は、runner image更新で壊れるリスクを記録する。
