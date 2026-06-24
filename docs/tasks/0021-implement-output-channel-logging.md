# タスク: Outputチャンネルへのログ出力機能を実装する

## Status

Done

## 目的

外部コマンド（Ghostscript、ImageMagickなど）が失敗した場合に、VS CodeのOutputチャンネルへ適切なログを出力する機能を実装する。

## 完了条件

- `cropPdfFiles`に`outputChannel`オプションを追加する
- Ghostscript実行失敗時にOutputチャンネルへログを出力する
- ログにはエラー内容（エラーメッセージ、コマンド、引数など）が含まれる
- `cropPdfAuto`コマンドでOutputチャンネルを作成して渡す
- `pnpm run test`成功

## 変更可能なファイル

- `src/operations/crop_pdf_auto.ts`
- `src/commands/crop_pdf_auto.ts`
- `docs/test-matrix.md`

## 対象外

- 他のコマンド（splitPdfなど）のログ出力（cropPdf.autoでパターンを確立後）
- ログのフォーマットの細部調整（重要な情報が含まれていれば十分）
- 新しいdependency追加

## 関連

- `docs/specs/file-operation-security.md`

## 確認方法

- `pnpm run test`

## 実施結果

- `cropPdfFiles`に`outputChannel`オプションを追加した
- Ghostscript実行失敗時にOutputチャンネルへログを出力するようにした
- ログにはエラーメッセージとコマンドが含まれる
- `cropPdfAuto`コマンドでOutputチャンネルを作成して渡すようにした
- `pnpm run test` 成功（38 tests）
