# タスク: パッケージ済みVSIXのオフライン3 OS smoke testを追加する

## Status

Todo

## 目的

release用に生成したVSIXをLinux、macOS、WindowsのVS Codeへinstallし、networkなしでもextension activation、PDF.js Webview preview、外部CLIなしで完結する主要機能が動くことを確認する。

## 完了条件

- 3 OSで対象platformのVSIXをinstallしている
- network accessを禁止した状態でextensionがactivateする
- Crop PDF ConfigureでPDFの全ページがcanvasへ描画される
- `pdf-lib`だけで完結するcrop / merge経路を実行できる
- 外部CLIがない場合に、CLI依存機能が誤って成功扱いにならないことを確認する
- test失敗時にVS Code、Webview、network errorの証拠をartifactへ残す
- VS Code終了後に一時workspaceとVS Code user-dataが残らない

## 変更可能なファイル

- `.github/workflows/`
- `test/`
- `scripts/`
- `docs/tasks/0180-add-packaged-vsix-offline-smoke-tests.md`
- `docs/tasks/README.md`
- 必要な`docs/research/`

## 対象外

- VSIXのproduction dependency同梱方式の変更
- release tagの作成・公開
- 変換処理やPDF.js描画の実装変更
- 外部CLIのinstall方式変更

## 実装内容

- 既存のElectron Playwright testを、`LGH_VSIX_PATH`指定時は開発用拡張pathを使わず、VSIXを一時extensions directoryへinstallして起動する経路へ拡張した
- packaged testでは`--host-resolver-rules=MAP * ~NOTFOUND`をVS Codeへ渡し、Webviewから外部URLへのfetchが成功しないことを確認する
- 既存のCrop PDF Configure UIで、VSIXに含まれるextensionのactivate、PDF.jsの全ページcanvas描画、pdf-libによるcrop結果を確認する
- install済みextensionの`merge_pdf`を読み込み、pdf-libだけのmerge結果を確認する
- 同じinstall済みextensionのPNG変換に存在しない`pdftocairo` pathを渡し、CLI依存処理が成功扱いにならないことを確認する
- テスト終了時にVS Codeを閉じ、install先を含む隔離された一時directoryを削除する。WindowsではVS Codeのprocess treeを終了してから削除する。VS Code CLIのuninstallはmetadataを残すOS差があるため、終了処理には使わない
- release workflowの既存3 OS matrixでplatform-specific VSIXを生成し、packaged smoke testをLinux、macOS、Windowsすべてで実行する。通常PRのTest workflowではこの重い検証を実行しない。失敗時は各OSの`test-results/`をartifactへ保存する

VS Codeのdownload、VSIX生成、VSIX installはテスト準備のためnetworkを使う。networkなしの確認対象は、VSIXをinstallして起動した後のVS Code / extension / Webview / pdf-lib処理である。

## 関連

- [0162: パッケージ済みVSIXのオフライン・3 OS動作を調査する](0162-audit-offline-vsix-cross-platform.md)
- [0179: VSIXのproduction dependency同梱とplatform packageを成立させる](0179-fix-vsix-production-dependency-packaging.md)

## 確認方法

- GitHub Actionsのrelease workflowにある3 OS matrix
- network遮断を明示したVS Code起動
- VSIX install後のfile system確認
- `pnpm run check`
- `git diff --check`

## 実施した確認

- `pnpm run check`
- `pnpm run check:test`
- `pnpm run test:vscode`
- `pnpm exec playwright test --project=vscode-electron test/playwright/electron/crop_pdf_configure.spec.ts`
- `pnpm run build`
- `pnpm run package:vsix -- --target darwin-arm64 --out /tmp/lgh-packaged-offline-smoke.vsix`
- 生成したVSIXをinstallしたextensionからmergeを実行し、5ページのPDFを確認した
- 生成したVSIXをinstallしたextensionに存在しない`pdftocairo` pathを渡し、失敗することを確認した

ローカルmacOSでは、packaged VSIX経路のElectron起動時にVS Code 1.128.0がmacOSのLaunchServices内で`SIGABRT`する環境依存の失敗が発生した。同じ環境の既存Electron testは成功しているため、3 OSのpackaged UI経路はPRのGitHub Actionsで確認する。

## Windows timeoutの追加修正

GitHub ActionsのWindows実行では、PDF表示・crop・merge・CLI失敗確認まで成功した後、packaged VSIXに含まれる大量のproduction dependencyを削除する終了処理が通常の120秒テスト上限を超えた。

そのため、packaged VSIX経路だけテスト上限を240秒へ広げ、`taskkill`にも10秒の上限を設定して、終了処理が無期限にテストを占有しないようにした。通常PRのTest workflowからはpackaged smokeを外し、release workflowの3 OS package jobで実行する。次回のrelease workflowでWindowsを含む3 OSの結果を確認するまで、Statusは`Todo`のままとする。
