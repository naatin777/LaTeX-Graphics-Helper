# タスク: outputPathテンプレート変数の入力基準を整理する

## Status

Done

## 目的

変換コマンドの `outputPath` テンプレート変数が、中間ファイルではなくユーザーが選んだ入力を基準に展開されることを明確にする。

## 完了条件

- `docs/specs/output-format-conversion.md` にoutputPathテンプレート変数の入力基準を記録する
- editable Draw.io画像の論理入力パスをテストで固定する
- 関数名を仕様に合わせて分かりやすくする
- タスク一覧にこのタスクを追加する

## 変更可能なファイル

- `docs/specs/output-format-conversion.md`
- `docs/tasks/0069-define-output-path-template-source-semantics.md`
- `docs/tasks/README.md`
- `src/commands/convert_png_to_pdf.ts`
- `src/commands/convert_to_png.ts`
- `test/convert_to_pdf_command.test.ts`

## 対象外

- 新しいoutputPath変数の追加
- 既存設定キーの統合
- 既存ユーザー設定のmigration
- Draw.io変換経路そのものの変更

## 関連

- `docs/specs/output-format-conversion.md`
- `docs/tasks/0054-implement-editable-drawio-image-to-pdf.md`
- `docs/tasks/0065-implement-convert-to-png.md`

## 確認方法

- `pnpm run check`
