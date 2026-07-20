# タスク: パッケージ済みVSIXのオフライン3 OS smoke testを追加する

## Status

Todo

## 目的

release用に生成したVSIXをLinux、macOS、WindowsのVS Codeへinstallし、Webviewの外部network依存を遮断した状態でextension activation、PDF.js Webview preview、主要なPDF処理が動くことを確認する。

## 完了条件

- 3 OSで対象platformのVSIXをinstallしている
- Webviewの外部network accessを禁止した状態でextensionがactivateし、外部fetchが成功しない
- Crop PDF ConfigureでPDFの全ページがcanvasへ描画される
- `pdf-lib`だけで完結するcrop / merge / split経路を実行できる
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
- install済みextensionの`split_pdf_all_pages`を読み込み、pdf-libだけのsplit結果と各1ページ出力を確認する
- 同じinstall済みextensionのPDF→JPEG変換に存在しない`pdftocairo` pathを渡し、失敗通知が出て出力ファイルが作成されないことを確認する
- テスト終了時にVS Codeを閉じ、install先を含む隔離された一時directoryを削除する。WindowsではVS Codeのprocess treeを終了してから削除する。VS Code CLIのuninstallはmetadataを残すOS差があるため、終了処理には使わない
- release workflowの既存3 OS matrixでplatform-specific VSIXを生成し、packaged smoke testをLinux、macOS、Windowsすべてで実行する。通常PRのTest workflowではこの重い検証を実行しない。失敗時は各OSの`test-results/`をartifactへ保存する。PRでは同じpackage/install/Electron smoke経路を`playwright.yml`で検証する

VS Codeのdownload、VSIX生成、VSIX installはテスト準備のためnetworkを使う。このtaskが保証するoffline範囲は、VS Code Chromiumのresolver ruleによるWebview外部fetchの遮断である。Extension HostのNode.js通信やOS全体のnetworkを禁止するものではない。

## 関連

- [0162: パッケージ済みVSIXのオフライン・3 OS動作を調査する](0162-audit-offline-vsix-cross-platform.md)
- [0179: VSIXのproduction dependency同梱とplatform packageを成立させる](0179-fix-vsix-production-dependency-packaging.md)

## 確認方法

- GitHub Actionsのrelease workflowにある3 OS matrix
- Webview外部network遮断を明示したVS Code起動
- VSIX install後のfile system確認
- `npm run check`
- `git diff --check`

## 実施した確認

- `npm run check`
- `npm test`
- `npm run test:playwright`
- `npm run build`
- `npm run package:vsix -- --target darwin-arm64 --out /tmp/lgh-packaged-offline-smoke.vsix`
- 生成したVSIXをinstallしたextensionからmergeを実行し、5ページのPDFを確認した
- 生成したVSIXをinstallしたextensionでPDF→JPEGを実行し、存在しない`pdftocairo` pathによる失敗通知と出力不在を確認した
- 新しい0180用PRの`Check`、`Test`、`Playwright`をLinux、macOS、Windowsで実行し、packaged Electron PlaywrightでCrop / Merge / SplitとCLI失敗経路が成功するまでStatusを`Todo`に維持する

ローカルmacOSでは、packaged VSIX経路のElectron起動時にVS Code 1.128.0がmacOSのLaunchServices内で`SIGABRT`する環境依存の失敗が発生した。同じ環境の既存Electron testは成功しているため、3 OSのpackaged UI経路はPRのGitHub Actionsで確認する。

## Windows timeoutの追加修正

GitHub ActionsのWindows実行では、PDF表示・crop・merge・CLI失敗確認まで成功した後、packaged VSIXに含まれる大量のproduction dependencyを削除する終了処理が通常の120秒テスト上限を超えた。

そのため、packaged VSIX経路だけテスト上限を240秒へ広げ、`taskkill`にも10秒の上限を設定して、終了処理が無期限にテストを占有しないようにした。通常PRのTest workflowからはpackaged smokeを外し、release workflowの3 OS package jobと同じ経路をPlaywright workflowで実行する。旧PR #366の結果は新しい0180用PRの証跡として再利用せず、cleanなbaseからのPRで再確認する。release tagの作成・公開は対象外のため実行しない。
