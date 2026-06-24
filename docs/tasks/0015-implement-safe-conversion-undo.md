# タスク: 安全な直前変換取消を実装する

## Status

Done

## 目的

変換完了通知から、変更されていない直前の変換出力だけを安全に削除できるようにする。

## 完了条件

- 直前の変換1回分だけをメモリに記録する
- 生成時と取消時にSHA-256を使用する
- 全出力を検証してから削除を開始する
- 変更、欠損、workspace境界違反があれば何も削除しない
- 変換完了通知に「取り消す」がある
- `latex-graphics-helper.undoLastConversion` commandを登録する
- 通常Undoのkeybindingを追加しない
- 作業領域を削除しない

## 変更可能なファイル

- `src/operations/undo_last_conversion.ts`
- `src/commands/undo_last_conversion.ts`
- `src/commands/crop_pdf_auto.ts`
- `src/extension.ts`
- `package.json`
- `package.nls.json`
- `package.nls.ja.json`
- `docs/specs/auto-crop.md`
- `docs/specs/undo-last-conversion.md`
- `docs/test-matrix.md`
- `docs/tasks/README.md`
- `docs/tasks/0015-implement-safe-conversion-undo.md`

## 対象外

- 複数回分の履歴
- VS Code再起動後の取消
- 既存ファイルを上書きした場合の復元
- safe mode UI

## 関連

- `docs/adr/0007-use-dedicated-command-to-undo-last-conversion.md`
- `docs/specs/undo-last-conversion.md`
- `docs/tasks/0014-add-safe-conversion-undo-tests.md`

## 確認方法

- `pnpm run check:all`
- `pnpm run test`

## 実施結果

- 直前の変換1回分をメモリ上に記録する処理を追加した
- 各出力について生成直後のSHA-256を記録する
- 取消前に全出力の存在、workspace境界、SHA-256を検証する
- 全検証成功後、削除直前にも境界とSHA-256を再検証する
- 変更、欠損、workspace外symlinkが1件でもあれば削除を開始しない
- 変換完了通知に「Undo」を追加した
- `latex-graphics-helper.undoLastConversion` commandを登録した
- 古い通知から新しい変換を誤って取り消さないよう、変換IDを照合する
- 通常Undoのkeybindingは追加していない
- `.latex-graphics-helper/` 内の作業ファイルは削除しない
- `pnpm run check:all` 成功（既存を含むlint warningあり）
- `pnpm run test` 成功（26 tests）

## 残る制約

- 複数出力の削除はファイルシステム上の原子的操作ではないため、削除途中のI/Oエラーでは一部だけ削除される可能性がある
- 既存ファイルを上書きする将来機能では、別途バックアップと復元仕様が必要
