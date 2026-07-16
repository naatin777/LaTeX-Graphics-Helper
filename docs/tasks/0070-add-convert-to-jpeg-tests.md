# タスク: convertToJpegの失敗テストを追加する

## Status

Done

## 目的

出力形式基準コマンドの次の段階として、`latex-graphics-helper.convertToJpeg` の期待挙動を実装前にテストで固定する。

## 完了条件

- `convertToJpeg` がpackage manifest上で公開されることをテストする
- `convertToJpeg` がVS Code commandとして登録されることをテストする
- PNGをJPEGへ変換できることをテストする
- 未実装を理由にテストが失敗することを確認する
- タスク一覧にこのタスクを追加する

## 変更可能なファイル

- `docs/tasks/0070-add-convert-to-jpeg-tests.md`
- `docs/tasks/README.md`
- `test/package_manifest.test.ts`
- `test/convert_to_jpeg_command.test.ts`

## 対象外

- `convertToJpeg` の実装
- package.jsonの実装修正
- JPEG以外の出力形式追加
- Draw.io / Mermaid / PDFからJPEGへの詳細実装

## 関連

- `docs/specs/internal/output-format-conversion.md`

## 確認方法

- `pnpm run check`
- `pnpm run test -- --grep "JPEGに変換"`

## 確認結果

- `CI=true pnpm run check` は成功した
- `CI=true pnpm run test -- --grep "JPEGに変換|変換サブメニューにJPEG"` は、`convertToJpeg` 未実装を理由に想定どおり失敗した
- 失敗内容:
  - package manifestに `latex-graphics-helper.convertToJpeg` がない
  - `package.nls.ja.json` に `command.convertToJpeg` がない
  - VS Code commandとして `latex-graphics-helper.convertToJpeg` が登録されていない
  - `latex-graphics-helper.convertToJpeg` 実行時にcommand not foundになる
