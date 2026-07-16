# タスク: splitPdf.configure GUIの仕様を決める

## Status

Todo

## 目的

`latex-graphics-helper.splitPdf.configure` で、PDFのページをユーザーが選択して分割出力するGUI仕様を決める。

`manual` という名前は使わない。

## 完了条件

- 対象入力を決める
  - 単一PDFのみか、複数PDFも扱うか
- ページ選択UIの仕様を決める
  - チェックボックス
  - 範囲入力
  - ページサムネイル
- 出力単位を決める
  - 選択ページをページごとにPDF出力する
  - 選択ページを1つのPDFへまとめる
  - 両方を扱う
- `outputPath.splitPdf` と `${page}` の扱いを決める
- Safe Mode / Undo / progress / cancellation の扱いを決める
- `splitPdf.allPages` との関係を決める

## 変更可能なファイル

- `docs/specs/`
- `docs/tasks/0106-design-split-pdf-configure-gui.md`
- 必要なら `docs/adr/`
- 必要なら `docs/tasks/README.md`

## 対象外

- 実装
- テスト追加
- merge GUI
- crop GUI

## 関連

- [0102: PDF configure GUI機能の未実装範囲を整理する](0102-track-pdf-manual-gui-backlog.md)
- [split-pdf-all-pages.md](../specs/internal/split-pdf-all-pages.md)
- [pdf-operation-command-modes.md](../specs/internal/pdf-operation-command-modes.md)

## 確認方法

- 仕様の未決事項が残っていないことを確認する
