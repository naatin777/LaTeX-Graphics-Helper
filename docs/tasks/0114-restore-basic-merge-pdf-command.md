# タスク: 現行PDF結合コマンドの基本動作を実装する

## Status

Done

## 目的

追加済みの失敗テストを通す最小範囲で、現行PDF結合コマンドの基本動作を実装する。

旧 `latex-graphics-helper.mergePdf` command IDは復元しない。v1.0.0へ向けた破壊的変更として、現行の `mergePdf.selectedPages` または仕様で決めた現行commandへ移行する。

## 完了条件

- 選択された複数PDFを1つのPDFへ結合できる
- 対象commandが `src/extension.ts` に登録されている
- ExplorerのPDF結合メニューから実行できる
- 旧 `latex-graphics-helper.mergePdf` command IDは追加しない
- 出力反映が既存のSafe Mode / Undo方針から外れていない
- 追加済みテストが成功する

## 実装メモ

- 出力先は `vscode.window.showSaveDialog` で選択する。
- `outputPath.mergePdf` はまだ導入しない。
- 選択されたPDFの全ページを選択順に1つのPDFへ結合する。
- 旧 `latex-graphics-helper.mergePdf` command IDは追加していない。
- Save Dialogでユーザーが出力先を明示選択するため、今回の基本実装ではSafe Mode / Undo / cancellationは扱わない。必要になったら別タスクで固定する。

## 変更可能なファイル

- `src/commands/`
- `src/operations/`
- `src/extension.ts`
- `package.json`
- `package.nls.ja.json`
- `package.nls.json`
- `test/`
- `docs/tasks/0114-restore-basic-merge-pdf-command.md`

## 対象外

- merge manual GUI
- ページ単位merge
- drag & dropによる順序変更
- legacy command alias
- dependency追加

## 関連

- [0113: v0.5.1相当のPDF結合コマンドの失敗テストを追加する](0113-add-basic-merge-pdf-command-tests.md)

## 確認方法

- `pnpm run check`
- `pnpm run check:test`
- `CI=true pnpm run test:vscode`
