# タスク: VS Code WebviewでPDF.jsを安定して読み込む

## Status

Done

## 目的

実VS CodeのCrop PDF Configureで、初期情報は表示される一方、PDF previewのcanvasもerrorも生成されない状態を解消する。

0154のElectron E2Eが検出したWebview読込の不安定さだけを対象とする。

## 確認済みの状態

- Webviewは`init` messageを受け取り、file name、page count、page sizeを表示している
- `pdfjs-dist`のdynamic import用chunkは取得されている
- 失敗時はPDF本体とworkerのresource requestへ進んでいない
- 同じCI条件でも描画できる実行と描画できない実行がある
- 固定待機の延長、Playwright retry、background throttling無効化、一時directory変更では解消しない

## Implementation Phase

- `Map.prototype.getOrInsertComputed`のpolyfillを`pdfjs-dist`のmodule評価より前に適用する
- `pdfjs-dist`をWebviewの初期bundleへ静的に含め、実行時dynamic importを廃止する
- ViteでPDF.js workerを別assetへbundleし、取得後にblob workerとして`workerPort`へ渡す
- worker側にも`Map.prototype.getOrInsertComputed`のpolyfillを適用する
- Crop PDFとMerge PDFが共有するPDF描画経路を維持する
- 0154で追加済みのElectron E2Eの期待値は変更しない

## 完了条件

- Webview build後に`pdfjs-dist`用のdynamic import chunkが生成されない
- Crop PDFとMerge PDFのbrowser Playwright testが成功する
- Crop PDF ConfigureのElectron E2EでPDFの全2ページが表示される
- Electron E2Eを3回連続実行してPDF previewが空にならない
- `pnpm run check:all`が成功する
- dependencyとlockfileを変更していない

## 変更可能なファイル

- `docs/tasks/0155-stabilize-pdfjs-loading-in-vscode-webview.md`
- `docs/tasks/0154-add-crop-pdf-configure-electron-e2e.md`
- `docs/tasks/README.md`
- `webview/shared/pdf/render_first_page.ts`
- `webview/shared/pdf/install_map_get_or_insert_computed.ts`
- `webview/shared/pdf/pdfjs_worker.ts`

## 対象外

- 0154のtest、snapshot、PR本文の変更
- Crop PDF / Merge PDFのUIと仕様変更
- PDF crop処理の変更
- dependency追加
- 固定sleep、timeout延長、retry追加による回避

## 関連

- [0154: Crop PDF ConfigureのElectron E2Eとtheme snapshotを追加する](0154-add-crop-pdf-configure-electron-e2e.md)
- [ADR-0013: VS Code ElectronをWebview visual testに使う](../adr/0013-use-vscode-electron-for-webview-visual-tests.md)
- [PDF configure crop仕様](../specs/crop-pdf-configure.md)

## 確認方法

- `pnpm run check:all`
- `pnpm run test:playwright`
- `pnpm run test:playwright:electron`
- `find media/webview -path '*/chunks/pdf-*.js' -print`
- `git diff --check`

## 実施結果

- `pdfjs-dist`を初期bundleへ含め、dynamic import用chunkが生成されないことを確認した
- 静的bundle化だけでは空のpreviewが再発し、worker初期化の`ready` / `test`待ちが主原因と判断した
- worker assetを先にfetchしてblob workerとして渡し、worker内にもMap polyfillを適用した
- Crop PDF / Merge PDFを含むbrowser Playwright test 18件が成功した
- Electron E2Eを3回連続実行し、PDF全2ページ、Dark / Light切替、Apply、出力PDF検証まで成功した
- 初期bundleは約445KBを維持し、約1.17MBのworkerは別assetとして必要時に読み込む
- `pnpm run check:all`と`git diff --check`が成功した
- dependencyとlockfileは変更していない
