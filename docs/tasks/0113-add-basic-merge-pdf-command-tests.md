# タスク: 現行PDF結合コマンドの基本動作テストを追加する

## Status

Done

## 目的

現行のPDF結合コマンドで、複数PDFを1つのPDFへ結合する基本動作を実装する前に、失敗テストを追加する。

旧 `latex-graphics-helper.mergePdf` command IDは復元しない。対象は現行の `latex-graphics-helper.mergePdf.selectedPages` または仕様で決めた現行commandとする。

## 完了条件

- 複数PDFを選択して1つのPDFへ結合するcommand behaviorをテストする
- 旧 `latex-graphics-helper.mergePdf` ではなく現行commandを対象にする
- 出力先選択のmock方針を決める
- Safe Mode / Undo / cancellation のうち、この段階で固定する範囲を明記する
- 実装未完了を理由に追加テストが失敗することを確認する

## 追加したテスト

- `test/merge_pdf_command.test.ts`
  - `latex-graphics-helper.mergePdf.selectedPages` が登録されていること
  - 複数PDFを選択順に1つのPDFへ結合し、ページ数とページサイズ順が維持されること

## mock方針

- 出力先選択は `vscode.window.showSaveDialog` をmockする。
- 成功・失敗通知は既存command testと同じく `showInformationMessage` / `showErrorMessage` をmockする。
- 通知でcommand完了が止まる可能性に備え、`test/helpers/vscode_command.ts` のhelperを使う。

## この段階で固定しない範囲

- Safe Mode
- Undo
- cancellation
- Webview GUIでのページ単位merge

これらは基本結合コマンドを復元した後、必要に応じて別タスクで扱う。

## 失敗確認

- `CI=true pnpm run test -- --grep "PDF結合コマンド"` を実行した。
- 現状はgrep指定が実質全体VS Code testとして走るが、追加した2件は以下の理由で失敗した。
  - `latex-graphics-helper.mergePdf.selectedPages` が登録されていない
  - `command 'latex-graphics-helper.mergePdf.selectedPages' not found`

## 変更可能なファイル

- `test/`
- `docs/tasks/0113-add-basic-merge-pdf-command-tests.md`

## 対象外

- `src/` の実装変更
- Webview GUIのテスト
- ページ単位mergeのテスト
- legacy command aliasのテスト

## 関連

- [0112: v0.5.1公開機能との差分を整理する](0112-track-v051-public-feature-parity.md)
- [0109: mergePdf GUIの仕様を決める](0109-design-merge-pdf-gui.md)

## 確認方法

- `pnpm run check:test`
- `CI=true pnpm run test:vscode`
