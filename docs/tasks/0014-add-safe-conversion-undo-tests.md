# タスク: 安全な変換取消の失敗テストを追加する

## Status

Done

## 目的

直前の変換結果を安全に削除する条件を、実装前のテストとして固定する。

## 完了条件

- hashが一致する複数出力を削除できるテストがある
- 1件でも変更されていれば何も削除しないテストがある
- 1件でも欠損していれば何も削除しないテストがある
- workspace外を指すsymlinkへ変更されていれば何も削除しないテストがある
- 作業領域のファイルを削除しないテストがある
- 未実装を理由としてテストが失敗することを確認する

## 変更可能なファイル

- `test/undo_last_conversion.test.ts`
- `docs/test-matrix.md`
- `docs/tasks/README.md`
- `docs/tasks/0014-add-safe-conversion-undo-tests.md`
- `docs/tasks/0015-implement-safe-conversion-undo.md`

## 対象外

- 取消処理の実装
- 通知UIの実装
- keybindingの追加

## 関連

- `docs/adr/0007-use-dedicated-command-to-undo-last-conversion.md`
- `docs/specs/undo-last-conversion.md`

## 確認方法

- `pnpm run check:test`
- 未実装moduleが存在しないため失敗することを確認する

## 実施結果

- 未変更の複数出力を削除し、内部作業ファイルを残すテストを追加した
- 変更、欠損、workspace外symlinkがある場合に削除を開始しないテストを追加した
- `pnpm run check:test` は未実装の `src/operations/undo_last_conversion.ts` が存在しないため、想定どおり失敗した
