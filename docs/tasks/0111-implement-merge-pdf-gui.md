# タスク: mergePdf GUIを実装する

## Status

Todo

## 目的

追加済みの失敗テストを通す最小範囲で、`latex-graphics-helper.mergePdf.configure` のPDF結合GUIを実装する。

## 完了条件

- 対象コマンドが `src/extension.ts` に登録されている
- Explorerの `PDFを結合` サブメニューからGUIを開ける
- GUIでPDFまたはページの選択・順序を指定できる
- 指定内容に基づいてPDFを結合できる
- 出力反映が既存のSafe Mode / Undo方針から外れていない
- 追加済みテストが成功する

## 変更可能なファイル

- `src/commands/`
- `src/operations/`
- `src/presentation/webview/`
- `webview/apps/merge_pdf/`
- `package.json`
- `package.nls.ja.json`
- `package.nls.json`
- `test/`
- `test/playwright/`
- `docs/tasks/0111-implement-merge-pdf-gui.md`

## 対象外

- crop GUI
- split GUI
- localブランチの大規模リファクタ移植
- dependency追加

## 関連

- [0109: mergePdf GUIの仕様を決める](0109-design-merge-pdf-gui.md)
- [0110: mergePdf GUIの失敗テストを追加する](0110-add-merge-pdf-gui-tests.md)

## 確認方法

- `pnpm run check`
- `pnpm run check:test`
- `pnpm run test:playwright`
- `CI=true pnpm run test:vscode`
