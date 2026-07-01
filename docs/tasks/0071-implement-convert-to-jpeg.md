# タスク: convertToJpegを実装する

## Status

Done

## 目的

0070で追加した失敗テストを通す最小実装として、`latex-graphics-helper.convertToJpeg` を追加する。

## 完了条件

- `latex-graphics-helper.convertToJpeg` をpackage manifestへ追加する
- `latex-graphics-helper.convertToJpeg` をVS Code commandとして登録する
- PNGをJPEGへ変換できる
- JPEG出力がSafe Mode / Undo / progress / cancellationの既存フローに乗る
- タスク一覧にこのタスクを追加する

## 変更可能なファイル

- `docs/tasks/0071-implement-convert-to-jpeg.md`
- `docs/tasks/README.md`
- `package.json`
- `package.nls.json`
- `package.nls.ja.json`
- `src/extension.ts`
- `src/commands/convert_to_jpeg.ts`
- `src/operations/convert_to_jpeg.ts`

## 対象外

- `convertToWebp` / `convertToAvif` の実装
- JPEG出力品質などの詳細設定追加
- 画像内容のpixel完全一致テスト

## 関連

- `docs/tasks/0070-add-convert-to-jpeg-tests.md`
- `docs/specs/output-format-conversion.md`

## 確認方法

- `pnpm run check`
- `pnpm run test -- --grep "JPEGに変換|変換サブメニューにJPEG"`

## 確認結果

- `CI=true pnpm run check` は成功した
- `CI=true pnpm run test -- --grep "JPEGに変換|変換サブメニューにJPEG"` は成功した
- `CI=true pnpm run test` は成功した
