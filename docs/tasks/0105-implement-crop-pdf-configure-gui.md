# タスク: cropPdf.configure GUIを実装する

## Status

Done

## 目的

追加済みの失敗テストを通す最小範囲で、`latex-graphics-helper.cropPdf.configure` を実装する。

## 完了条件

- `cropPdf.configure` commandが `src/extension.ts` に登録されている
- ExplorerのPDF切り抜きサブメニューからWebviewを開ける
- WebviewでPDFを表示できる
- ユーザーが指定したcrop範囲をHostへ送れる
- Host側でcrop範囲を使ってPDFを出力できる
- 出力反映が既存のSafe Mode / Undo方針から外れていない
- 追加済みテストが成功する

## 変更可能なファイル

- `src/commands/`
- `src/operations/`
- `src/presentation/webview/`
- `webview/apps/crop_pdf/`
- `package.json`
- `package.nls.ja.json`
- `package.nls.json`
- `test/`
- `test/playwright/`
- `docs/tasks/0105-implement-crop-pdf-configure-gui.md`

## 対象外

- split GUI
- merge GUI
- localブランチの大規模リファクタ移植
- crop UIの高度な作り込み
- dependency追加

## 関連

- [0103: cropPdf.configure GUIの仕様を決める](0103-design-crop-pdf-configure-gui.md)
- [0104: cropPdf.configure GUIの失敗テストを追加する](0104-add-crop-pdf-configure-gui-tests.md)

## 確認方法

- `pnpm run check`
- `pnpm run check:test`
- `pnpm run test:playwright`
- `CI=true pnpm run test:vscode`

## 実施内容

- `cropPdf.configure` の `apply` messageをHost側で受け取り、PDF出力処理を開始するようにした
- cropBoxをPDFポイントのbboxとして検証し、対象ページのMediaBox/CropBoxへ反映する処理を追加した
- 作業ファイルを `.latex-graphics-helper/crop-pdf-configure/` 配下に残すようにした
- 出力反映を既存のSafe Mode / Undo処理へ接続した
- Webview起動直後のmessage取りこぼしを避けるため、Webviewから `ready` を送ってからHostが `init` を返す流れにした

## 確認結果

- `CI=true pnpm run check:all`
- `CI=true pnpm run test:playwright -- -g "crop_pdf"`
- `CI=true pnpm run test -- --grep "configure cropコマンド|PDF自動crop処理|変換結果の反映処理"`
