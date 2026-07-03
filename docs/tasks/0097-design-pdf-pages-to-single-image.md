# タスク: PDFページを1つの画像へ結合する仕様を決める

## Status

Todo

## 目的

PDFの複数ページを、ページごとの画像ではなく1つの画像へ結合する機能を実装するか判断し、必要な仕様を決める。

## 完了条件

- 縦結合・横結合・gridなどの結合方向を決める
- 出力形式を決める
- 既存の `convertToPng` / `convertToJpeg` / `convertToWebp` / `convertToAvif` と別コマンドにするか決める
- Safe Mode / Undo / progress / cancellation の扱いを決める
- 実装する場合の次タスクを作れる状態になっている

## 変更可能なファイル

- `docs/specs/`
- `docs/tasks/0097-design-pdf-pages-to-single-image.md`
- 必要なら `docs/tasks/README.md`

## 対象外

- 実装
- テスト追加
- 画像編集UIの実装

## 関連

- [output-format-conversion.md](../specs/output-format-conversion.md)

## 確認方法

- 仕様の未決事項が明示されていることを確認する
