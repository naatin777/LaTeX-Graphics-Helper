# タスク: editable Draw.io画像のSafe Mode・Undo・cancelテストを追加する

## Status

Done

## 目的

`latex-graphics-helper.convertToPdf`でeditable Draw.io画像を扱うときも、既存変換フローのSafe Mode・Undo・cancellationに乗ることを失敗テストとして追加する。

## 完了条件

- editable Draw.io画像の出力競合時にSafe Modeの`Keep Both`が効くことをテストする
- editable Draw.io画像の上書き後にUndoで元ファイルへ戻せることをテストする
- editable Draw.io画像の変換がキャンセル済みの場合、出力へ反映しないことをテストする
- このタスクでは失敗テスト追加に留め、実装変更は行わない

## 変更可能なファイル

- `docs/tasks/0055-add-editable-drawio-image-flow-tests.md`
- `docs/tasks/README.md`
- `test/convert_to_pdf_command.test.ts`

## 対象外

- editable Draw.io画像をPDFへ変換する実装
- Draw.io CLIの呼び出し実装
- Safe Mode / Undo / cancellation の実装変更
- outputPathテンプレート変数の基準変更

## 関連

- `docs/tasks/0054-implement-editable-drawio-image-to-pdf.md`
- `docs/specs/output-format-conversion.md`
- `docs/specs/safe-mode.md`
- `docs/specs/undo-last-conversion.md`
- `docs/specs/conversion-progress-and-cancellation.md`

## 確認方法

- `pnpm run test`
