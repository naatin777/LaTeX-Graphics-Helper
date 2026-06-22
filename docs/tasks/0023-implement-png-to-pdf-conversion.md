# タスク: PNGをPDFに変換する機能を実装する

## Status

Done

## 目的

PNGファイルをPDFに変換する機能を実装する。テストが追加済みで、テストを通すための最小実装を行う。

## 完了条件

- `convertPngToPdf`コマンドを実装する
- `src/commands/convert_png_to_pdf.ts`を作成する
- `src/extension.ts`にコマンドを登録する
- Sharpを使用してPNGをPDFに変換する
- 出力パスを設定から取得する
- workspace境界を検証する
- 既存出力の検証をする
- テストを通す

## 変更可能なファイル

- `src/operations/convert_png_to_pdf.ts`（新規）
- `src/commands/convert_png_to_pdf.ts`（新規）
- `src/extension.ts`
- `package.json`（必要な場合）
- `test/extension.test.ts`

## 対象外

- 他の画像フォーマット（JPEG、WebP、Avif、SVG）の変換
- 高度な画像処理オプション
- 新しいdependency追加（Sharpは既に追加済み）

## 関連

- `docs/tasks/0022-add-png-to-pdf-conversion-tests.md`

## 確認方法

- `pnpm run test`
- `pnpm run check:all`

## 実施結果

- `src/operations/convert_png_to_pdf.ts`を作成した
- Sharpを使用してPNGをPDFに変換するようにした
- workspace境界を検証するようにした
- 既存出力の検証をするようにした
- `src/commands/convert_png_to_pdf.ts`を作成した
- `src/extension.ts`にコマンドを登録した
- `test/extension.test.ts`にコマンド登録のテストを追加した
- convertPngToPdfCommandの引数を修正してworkspacePathをオプション引数として追加した
- `pnpm run test` 成功（41 tests）
