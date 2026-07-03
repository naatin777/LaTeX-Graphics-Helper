# タスク: splitPdf.manual GUIを実装する

## Status

Todo

## 目的

追加済みの失敗テストを通す最小範囲で、`latex-graphics-helper.splitPdf.manual` を実装する。

## 完了条件

- `splitPdf.manual` commandが `src/extension.ts` に登録されている
- Explorerの `PDFを分割 > manual` からWebviewを開ける
- WebviewでPDFページを選択できる
- 選択ページに基づいてPDFを出力できる
- 出力反映が既存のSafe Mode / Undo方針から外れていない
- 追加済みテストが成功する

## 変更可能なファイル

- `src/commands/`
- `src/operations/`
- `src/presentation/webview/`
- `webview/apps/`
- `package.json`
- `package.nls.ja.json`
- `package.nls.json`
- `test/`
- `test/playwright/`
- `docs/tasks/0108-implement-split-pdf-manual-gui.md`

## 対象外

- crop GUI
- merge GUI
- localブランチの大規模リファクタ移植
- dependency追加

## 関連

- [0106: splitPdf.manual GUIの仕様を決める](0106-design-split-pdf-manual-gui.md)
- [0107: splitPdf.manual GUIの失敗テストを追加する](0107-add-split-pdf-manual-gui-tests.md)

## 確認方法

- `pnpm run check`
- `pnpm run check:test`
- `pnpm run test:playwright`
- `CI=true pnpm run test:vscode`
