# オフラインVSIXと3 OS配布の調査メモ

## 調査日

2026-07-15

## 対象と確認環境

- extension version: `1.0.0`
- Node.js: `24.16.0`
- pnpm: `11.8.0`
- `@vscode/vsce`: `3.9.2`
- `pdfjs-dist`: `6.0.227`
- `sharp`: `0.34.5`
- 実機確認: macOS arm64
- Linux / Windows: この調査ではパッケージ済みVSIXの実機実行は未確認

## 公式情報源

- [VS Code: Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [vscode-vsce repository](https://github.com/microsoft/vscode-vsce)
- [sharp: Installation](https://sharp.pixelplumbing.com/install/)

## 確認した方法

1. `pnpm run package`で通常のVSIX生成を実行した
2. `pnpm install --frozen-lockfile`後に1を再実行した
3. `pnpm exec vsce package --no-dependencies --out /tmp/lgh-offline-audit.vsix`で、依存検出を無効にした配布物を作成した
4. VSIXのfile一覧と`unzip -l`の内容を確認した
5. `src`、`webview`、生成済み`out`からruntimeのremote network accessを検索した
6. lockfileと現在の`node_modules`から`sharp`のplatform packageを確認した

## 確認できた事実

### VSIX生成

- `pnpm run package`は、buildとWebview compileまでは成功した
- `vsce package`は`npm list --production`で停止した
- エラーは`proxy-agent`と`playwright-core`の`invalid`、`supports-color`の`extraneous`で、pnpmの依存ツリーをnpmが検証する段階で発生した
- `pnpm install --frozen-lockfile`後も同じエラーになった。lockfileの未反映が原因とは確認できない
- `--no-dependencies`では958 files、約8.89 MBのVSIXを生成できた
- `--no-dependencies`で生成したVSIXには`extension/node_modules`が存在しない
- そのVSIXにも`out`と`media/webview`は含まれるが、`package.json`のruntime dependency（`pdf-lib`、`sharp`、`p-limit`、Mermaid CLI、Puppeteer Coreなど）は同梱されないため、実行可能なrelease artifactとは扱わない

### WebviewとPDF.js

VSIXの両Webview appに、次のassetが含まれていることを確認した。

- `pdf.worker.mjs`: 各app 1個
- `cmaps`: 各app 169個
- `standard_fonts`: 各app 16個
- `wasm`: 各app 13個

Host側は`webview.asWebviewUri`でworker、CMap、standard fonts、WASMのdirectoryをWebviewへ渡し、末尾の`/`も付けている。CSPも`connect-src`、`font-src`、`worker-src`にWebview、`data:`、`blob:`を許可している。

したがって、PDF.jsの補助assetが配布物から欠落していることは今回の調査では確認されなかった。

### network依存

- `src`と`webview`のruntime codeで確認できたnetwork APIは、Viteが同梱したPDF.js workerを読む`fetch(pdfJsWorkerUrl)`だけだった
- worker URLはWebviewのlocal resourceとして生成されるため、コード上は外部URLへのfetchではない
- GitHubやMarketplaceのURLはmanifest・READMEなどのmetadataであり、runtimeの取得処理ではない
- 実際にnetworkを遮断した状態で、正しいproduction dependencyを含むVSIXをVS Codeへinstallして起動する確認は未実施

### native dependency

- `sharp`はplatform / architectureごとのoptional packageをinstall時に選ぶ構成である
- lockfileにはdarwin、linux、win32など複数platformの`@img/sharp-*` packageが記録されている
- このmacOS arm64環境の`node_modules`には`@img/sharp-darwin-arm64`だけが実体として選択されている
- Linuxで作ったproduction dependency treeをそのままmacOS / Windowsへ持ち込んで動くとは判断できない
- VS Code公式もnative node moduleの配布にはplatform-specific VSIXを使う構成を案内している

### external CLI

VSIXにCLI本体は含まれない。次の設定値でユーザー環境の実体を参照する。

- `execPath.ghostscript`: crop auto
- `execPath.pdftocairo`: PDFから画像・SVGへの変換など
- `execPath.rsvgConvert`: SVGからPDFへの変換（rsvg engine選択時）
- `execPath.drawio`: Draw.io変換
- Puppeteerのbrowser executable / channel: SVG、Mermaid変換

PDF.jsのWebview preview、`pdf-lib`によるcrop / merge、外部CLIを使わない処理と、外部CLI・browser・native dependencyを必要とする変換は同じ「オフライン動作」として扱わない。

## OS別の確認状況

| OS          | VSIX内容の静的確認 | 正しいproduction dependencyを含むVSIXのinstall / 起動 | offline主要機能 | 判断                                                    |
| ----------- | ------------------ | ----------------------------------------------------- | --------------- | ------------------------------------------------------- |
| macOS arm64 | 済み               | 未確認。通常packageがvsce依存検出で失敗               | 未確認          | PDF.js assetは確認済み、release artifactは未成立        |
| Linux x64   | 未実施             | 未確認                                                | 未確認          | 既存CIのsource test成功だけではVSIX動作の根拠にならない |
| Windows x64 | 未実施             | 未確認                                                | 未確認          | ASCII stagingを含むVSIX経路は別確認が必要               |

## 判断

現時点では、次の理由から単一のfallback VSIXを3 OS向けのrelease artifactとして採用しない。

1. 通常の`vsce package`がpnpmの依存ツリーを検証できず、production dependency同梱を確認できない
2. `--no-dependencies`は実行に必要なruntime dependencyを含まない
3. `sharp`のnative binaryはinstall環境のOS / architectureに依存する
4. 正しいVSIXをnetwork遮断下で実行する3 OSテストがまだない

次の実装は、依存同梱方式とplatform-specific VSIXの生成を先に解決し、その後に実VSIXのオフラインsmoke testを追加する順番にする。

## 未確認事項

- npm / yarn互換のproduction dependency treeを使ったvsce packageが3 OSで成立するか
- `vsce package --target`と各OS runnerでsharpのnative packageを正しく含められるか
- packaged VSIXをVS Codeへinstallした後、extension activation、Webview preview、pdf-lib処理がnetworkなしで成功するか
- CLIなしで実行できる機能のユーザー向け表示が十分か
- `.vscodeignore`を整理してdocs・test・AI用設定を配布物から除外すべきか

## 後続タスク

- [0179: VSIXのproduction dependency同梱とplatform packageを成立させる](../tasks/0179-fix-vsix-production-dependency-packaging.md)
- [0180: パッケージ済みVSIXのオフライン3 OS smoke testを追加する](../tasks/0180-add-packaged-vsix-offline-smoke-tests.md)

## 関連

- [0162: パッケージ済みVSIXのオフライン・3 OS動作を調査する](../tasks/0162-audit-offline-vsix-cross-platform.md)
- [0155: VS Code WebviewでPDF.jsを安定して読み込む](../tasks/0155-stabilize-pdfjs-loading-in-vscode-webview.md)
