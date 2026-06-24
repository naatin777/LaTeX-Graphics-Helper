# タスク: macOS CIでconvert PNG to PDF command testがtimeoutする問題を修正する

## Status

Done

## 目的

PR #256のmacOS CIで、`convert PNG to PDF command executes and converts file` が通知待ちでtimeoutする問題を修正する。

## 完了条件

- 該当テストが通知UIの操作に依存しない
- コマンド実行後にPDFが生成されることを検証する
- 変換結果のPDFページ数を検証する
- macOS CI失敗の原因だった通知待ちをテスト対象から外す

## 変更可能なファイル

- `test/extension.test.ts`
- `docs/tasks/README.md`
- `docs/tasks/0039-fix-macos-convert-png-command-timeout.md`

## 対象外

- 変換実装の変更
- VS Code通知UI自体のテスト追加
- Safe ModeやUndoの仕様変更

## 関連

- PR #256
- `docs/tasks/0036-add-command-test-notification-helper.md`

## 確認方法

- `pnpm run check:test`
- `pnpm run test`
