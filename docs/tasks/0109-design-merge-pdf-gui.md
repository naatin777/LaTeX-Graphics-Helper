# タスク: mergePdf GUIの仕様を決める

## Status

Todo

## 目的

`latex-graphics-helper.mergePdf.selectedPages` と `latex-graphics-helper.mergePdf.manual` の役割を整理し、PDF結合GUIの仕様を決める。

## 完了条件

- `mergePdf.selectedPages` と `mergePdf.manual` の違いを決める
- まず復元すべき最小機能を決める
  - v0.5.1相当の選択PDF結合
  - ページ単位の選択結合
  - 順序変更つき結合
- 対象入力を決める
  - 複数PDF必須か
  - 単一PDFのページ再構成も扱うか
- GUIで扱う操作を決める
  - PDF順序変更
  - ページ選択
  - ページ順序変更
  - 出力先選択
- Safe Mode / Undo / progress / cancellation の扱いを決める
- 現行 `webview/apps/merge_pdf` を使うか、別appへ分けるか決める

## 変更可能なファイル

- `docs/specs/`
- `docs/tasks/0109-design-merge-pdf-gui.md`
- 必要なら `docs/adr/`
- 必要なら `docs/tasks/README.md`

## 対象外

- 実装
- テスト追加
- crop / split GUI

## 関連

- [0102: PDF manual GUI機能の未実装範囲を整理する](0102-track-pdf-manual-gui-backlog.md)
- [0006: WebviewにPDFの最初のページを表示する](0006-render-first-pdf-page-in-webviews.md)

## 確認方法

- 仕様の未決事項が残っていないことを確認する
