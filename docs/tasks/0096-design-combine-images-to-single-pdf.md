# タスク: 複数画像を1つのPDFへ結合する仕様を決める

## Status

Spec + 実装完了 — `docs/specs/product/combine-images-to-single-pdf.md` に記録済み。仕様に基づく実装とテストも完了済み。

## 目的

複数の画像入力を、画像ごとのPDFではなく1つのPDFへまとめる機能を実装するか判断し、必要な仕様を決める。

## 完了条件

- 対象入力形式を決める
- 出力PDFのページサイズルールを決める
- 既存の `convertToPdf` と別コマンドにするか決める
- Safe Mode / Undo / progress / cancellation の扱いを決める
- 実装する場合の次タスクを作れる状態になっている

## 変更可能なファイル

- `docs/specs/`
- `docs/tasks/0096-design-combine-images-to-single-pdf.md`
- 必要なら `docs/tasks/README.md`

## 対象外

- 実装
- テスト追加
- 画像順序を変更するUIの実装

## 関連

- [複数画像→1PDFの製品仕様](../specs/product/combine-images-to-single-pdf.md)
- [output-format-conversion.md](../specs/internal/output-format-conversion.md)
- [EPS変換の内部契約](../specs/internal/eps-conversion.md)

## 確認方法

- 仕様の未決事項が明示されていることを確認する
