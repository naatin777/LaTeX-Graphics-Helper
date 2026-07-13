# タスク: mergePdfの操作テストを追加する

## Status

Done

## 目的

`mergePdf.selectedFiles` コマンドの実際のPDF結合操作を統合テストでカバーする。

現在はコマンド登録テストのみで、実際のPDF結合ロジックとエッジケースが未テスト。

## 完了条件

- 複数のPDFファイルを結合できる
- 結合後のPDFページ数が正しい
- 結合後のPDFサイズが妥当である
- 入力ファイルの順序を維持する
- 結合対象がPDF以外の場合にエラーを出す
- 結合対象が1ファイル以下の場合にエラーを出す
- 既存出力がある場合も、成功結果を完全なPDFとして反映する
- 変換途中で失敗した場合は既存出力を変更しない

## 変更可能なファイル

- `test/merge_pdf_command.test.ts` (拡張または新規作成)
- `docs/tasks/README.md`
- `docs/tasks/0125-add-merge-pdf-operation-tests.md`
- `docs/test-matrix.md` (必要に応じて更新)

## 対象外

- mergePdf.manual コマンド（GUIベースの手動結合）
- PDFのページ順序変更機能
- 結合時のメタデータ処理
- Safe Mode / Undo / cancellation（基本結合コマンドでは0114で対象外と決定済み）
- UI細部のテスト

## 関連

- PDF操作仕様（関連specがあればリンク）
- [0021: Outputチャンネルへのログ出力機能を実装する](0021-implement-output-channel-logging.md)
- [0027: Safe Modeをcropとsplitへ実装する](0027-implement-safe-mode.md)

## 確認方法

- `CI=true pnpm run check:all`
- `CI=true ./node_modules/.bin/vscode-test --grep "PDF結合コマンド"`
- `CI=true pnpm run test`

## 確認結果

- `CI=true pnpm run check:all` 成功
- `CI=true ./node_modules/.bin/vscode-test --grep "PDF結合コマンド"` 6 passing
- `CI=true pnpm run test` 169 passing
