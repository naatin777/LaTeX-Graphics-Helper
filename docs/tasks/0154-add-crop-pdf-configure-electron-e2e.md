# タスク: Crop PDF ConfigureのElectron E2Eとtheme snapshotを追加する

## Status

Done

## 目的

固定fixtureを使い、実VS CodeのExplorerからCrop PDF Configureを開き、PDF preview、VS Code theme、Apply、出力PDFまでを一続きで検証する。

0153のsmoke testを拡張し、Electron applicationの起動回数を増やさない。

## Test Planning Phase

### テストする仕様

- 固定fixture `test/fixtures/pdf-operations/user-files/q a.pdf`を一時workspaceへコピーして使う
- 実Explorerのcontext menuからCrop PDF Configureを開く
- 拡張機能固有のSafe Mode status barを待ってからExplorer menuを開く
- Webviewにfixtureの全2ページ分のcanvasが生成され、各canvasの描画sizeが0より大きい
- PDF読込errorと描画errorが表示されない
- 実VS Codeから`vscode-dark` / `vscode-light` theme classと`--vscode-*` CSS変数が渡される
- 初期themeを`Default Dark Modern`へ固定し、同じVS Code session内で`Default Light Modern`へ切り替えられる
- theme切替はbody classとcomputed styleの変化を成立条件として待つ
- crop boxへ`left: 55`、`bottom: 12`、`right: 217`、`top: 149`を入力する
- targetは既定の`All pages`を使う
- Apply後に`q a-crop.pdf`が一時workspaceへ生成される
- 出力PDFは2ページを維持し、全ページのMediaBoxとCropBoxが`x: 55`、`y: 12`、`width: 162`、`height: 137`になる
- 元fixtureと一時workspace内の入力PDFを変更しない
- 成功時・失敗時ともVS Code processと一時directoryを片付ける

### 追加・変更するテスト

- `test/playwright/electron/crop_pdf_configure.spec.ts`の0153 smoke testを、上記を通す1本のE2E testへ拡張する
- crop値は`test/helpers/crop_configure_fixture.ts`の既存値を正本として使う
- Electron applicationを追加起動する別testは作らない

### mockするもの

- なし

VS Code、Explorer、Webview、PDF.js、Hostとのmessage、`pdf-lib`によるApply、実file出力を通す。

### 待機方法

- 固定sleep、`waitForTimeout`、秒数待ちは使わない
- 拡張読込はSafe Mode status barの表示で待つ
- PDF描画はcanvas countとcanvas sizeで待つ
- theme切替はbody classとcomputed styleで待つ
- Apply完了は出力PDFを読み込み可能になるまでfile状態をpollする

### theme snapshot

- Linux、VS Code 1.128.0、固定window size、`window.zoomLevel: 0`を基準環境にする
- 比較対象はVS Code window全体ではなく、実Webviewのbody領域だけにする
- crop値を入力した状態で以下をgolden比較する
  - `crop-pdf-configure-dark.png`
  - `crop-pdf-configure-light.png`
- animationを無効化し、caretを非表示にする
- 初期許容値は`maxDiffPixelRatio: 0.005`とする
- macOS / Windowsではgolden比較を行わない
- 初回はLinux CIが出力した画像をartifactから取得し、内容を確認してsnapshotへ追加する
- 正常なDark / Light画像は`test/playwright/electron/crop_pdf_configure.spec.ts-snapshots/`へコミットする
- PR本文ではコミット済みのDark / Light snapshotを横並びで表示する
- 失敗時はVS Code window全体のscreenshot、trace、診断情報を`test-results/`へ残す
- screenshotはUI regressionに使い、出力PDFの正しさはPDFのpage count / MediaBox / CropBoxで別に確認する

### テストしないもの

- `src/`またはWebview実装の修正
- Selected pages、Cancel、Safe Mode conflict、Undo、progress cancellation
- Quick cropと外部`pdfcrop` CLI
- 出力PDFを画像化した内容比較
- macOS / Windows / High Contrastのgolden
- crop範囲をpreview上でdragする操作
- 既存ブラウザPlaywright testの削除・期待値変更

テストが実装上の問題を検出した場合、期待値を緩めたり実装を同時に直したりせず、別タスクを作る。

## 完了条件

- 0153のsmoke testを1本の完全なE2E testへ拡張している
- 固定fixtureの全ページcanvas、実VS Code CSS変数、Dark / Light切替を確認している
- Dark / LightのLinux golden snapshotを確認して追加している
- crop値を入力してApplyし、出力PDFのpage count / MediaBox / CropBoxを確認している
- 固定sleepを使っていない
- 失敗時のVS Code window screenshot、trace、診断情報をartifactから取得できる
- `src/`、Webview実装、dependency、lockfileを変更していない
- 既存ブラウザPlaywright testが引き続き成功する
- Linux CIを含む全CIが成功する

## 変更可能なファイル

- `docs/tasks/0154-add-crop-pdf-configure-electron-e2e.md`
- `docs/tasks/README.md`
- `test/playwright/electron/crop_pdf_configure.spec.ts`
- `test/playwright/electron/helpers/`
- `test/playwright/electron/crop_pdf_configure.spec.ts-snapshots/`
- `test/helpers/crop_configure_fixture.ts`

## 対象外

- `src/`とWebview実装の変更
- dependencyとlockfileの変更
- 既存ブラウザPlaywright testの削除
- browser runner、Chromium install、関連workflowの削除
- macOS / Windows / High ContrastへのElectron E2E拡大
- Quick cropのElectron E2E

## 関連

- [PDF configure crop仕様](../specs/crop-pdf-configure.md)
- [テスト方針](../test-policy.md)
- [ADR-0013: VS Code ElectronをWebview visual testに使う](../adr/0013-use-vscode-electron-for-webview-visual-tests.md)
- [0152: VS Code Electron E2EでWebview visual testを設計する](0152-design-vscode-electron-e2e.md)
- [0153: VS Code Electron Playwright harnessを追加する](0153-add-vscode-electron-harness.md)

## 確認方法

- `pnpm run check:all`
- `pnpm run test:playwright`
- `pnpm run test:playwright:electron`
- `git diff --check`
- PRのLinux CIでgoldenを生成・確認後、snapshotを追加して全CIを再確認する

## 実施結果

- 実VS CodeのExplorerからCrop PDF Configureを開き、固定fixtureの2ページ描画、Dark / Light切替、Apply、出力PDFを1本のE2Eテストで確認した
- Linux CIで確認したDark / Light snapshotを追加した
- PlaywrightがWebviewのcanvasを黒く取得する場合に備え、実Webviewでpdf.jsが描画したcanvas pixelを使ってLight snapshotを構成した
- シナリオ、Webview操作・描画検証、失敗診断・後片付け、screenshot構成を別ファイルへ分割した
- `pnpm run check:all`、`pnpm run test:playwright:electron`、`git diff --check`が成功した
- GitHub ActionsのCheck、Playwright、VS Code testがLinux / macOS / Windowsですべて成功した
