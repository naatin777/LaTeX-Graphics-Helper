# タスク: cropPdf.configure GUIを実装する

## Status

Todo

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
