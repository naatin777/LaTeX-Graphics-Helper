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
- Crop PDF / Merge PDFを含むbrowser Playwright test 18件が成功した
- Electron E2Eを3回実行し、失敗時screenshotでは3回ともPDFの全2ページが描画された
- Electron E2Eは外側のWebview frameからcanvasを検索して0件になるため、test自体は失敗している
- frame取得とDark / Light snapshotの修正は0154へ戻して扱う
- `pnpm run check:all`と`git diff --check`が成功した
- dependencyとlockfileは変更していない
