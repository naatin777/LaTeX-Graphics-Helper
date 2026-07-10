# タスク: cropPdf.configureの操作テストを追加する

## Status

In Progress

## 目的

`cropPdf.configure` のWebview操作とHost側crop処理を、同じ固定fixtureを使うテストでカバーする。

WebviewとHostは別のrunnerで検証するが、crop boxとfixtureを共有して仕様のずれを防ぐ。

`cropPdf.configure` のHost側処理は`pdfcrop` CLIを使わず、`pdf-lib`でMediaBoxとCropBoxを変更している。出力内容の独立確認には`pdftocairo`でrasterizeした画像を使う。

## 完了条件

- ユーザー提供の固定PDF fixtureをテスト中の一時workspaceへコピーして使う
- Playwrightで固定fixtureを読み込み、crop box値と対象ページを変更してApply messageを送れる
- PlaywrightでCancel messageを送れる
- Host側operation testで全ページをcropした出力PDFを検証する
- Host側operation testで選択ページだけをcropし、未選択ページのboxが維持されることを検証する
- 出力PDFを`pdftocairo`でrasterizeし、crop後の内容位置が期待領域からずれていないことを検証する
- PDFのpage count、MediaBox、CropBoxも検証する
- テストはfixture正本を変更しない

## 変更可能なファイル

- `test/playwright/`
- `test/`
- `test/fixtures/`
- `docs/tasks/README.md`
- `docs/tasks/0123-add-crop-pdf-configure-operation-tests.md`
- `docs/test-matrix.md` (必要に応じて更新)

## 対象外

- ドラッグによるcrop範囲選択（将来機能）
- ページごとに異なるcrop範囲（将来機能）
- Host側crop処理の詳細変更
- UI細部のピクセルパーフェクトなテスト
- Playwright Electronによる実VS Code全体のE2E
- production codeの変更
- `pdfcrop` CLIの検証

## 関連

- [PDF configure crop仕様](../specs/crop-pdf-configure.md)
- [0120: cropPdf.configure GUIを実操作できる状態へ仕上げる](0120-finish-crop-pdf-configure-gui.md)
- [0121: cropPdf.configure GUIのレイアウトを左右分割へ改善する](0121-improve-crop-pdf-configure-layout.md)
- [0122: cropPdf.configureのズーム操作とスクロール範囲を改善する](0122-improve-crop-pdf-zoom-and-scroll.md)
- [0126: 実fixtureと画像比較を使うテスト方針を決める](0126-design-real-fixture-and-visual-testing.md)

## 確認方法

- `CI=true pnpm run check:all`
- `CI=true pnpm run test:playwright -- -g "crop_pdf"`
- `CI=true pnpm run test:vscode -- --grep "PDF configure crop処理"`
