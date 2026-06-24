# タスク: PNGをPDFに変換する機能のテストを追加する

## Status

Done

## 目的

PNGファイルをPDFに変換する振る舞いを、実装前の失敗テストとして固定する。

## 完了条件

- PNGをPDFに変換するテストを追加する
- テストファイルを作成する
- テストを実行してエラーになることを確認する

## Test Planning Phase

### どの仕様をテストするか

- PNGファイルをPDFに変換できる
- 出力パスを設定から取得できる
- workspace境界を検証できる
- 既存出力の検証ができる

### どのファイルにテストを追加するか

- `test/convert_png_to_pdf.test.ts`（新規）

### 何をmockするか

- なし。fixtureのPNGと実際のSharp、pdf-libを使用する。

### 何をテストしないか

- 他の画像フォーマット（JPEG、WebP、Avif、SVG）の変換
- 高度な画像処理オプション

## 変更可能なファイル

- `test/convert_png_to_pdf.test.ts`（新規）
- `docs/test-matrix.md`

## 対象外

- 実装の変更
- 既存実装のリファクタ
- 仕様変更
- dependency追加

## 関連

- `docs/tasks/0023-implement-png-to-pdf-conversion.md`

## 確認方法

- `pnpm run test`

## 実施結果

- `test/convert_png_to_pdf.test.ts`を作成した
- テストを実行してエラーを確認した（モジュールが存在しない）
- `pnpm run check:test` 失敗（TS2307: Cannot find module '../src/operations/convert_png_to_pdf.js'）
