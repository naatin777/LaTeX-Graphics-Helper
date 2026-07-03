# タスク: cropPdf.manual GUIの仕様を決める

## Status

Todo

## 目的

`latex-graphics-helper.cropPdf.manual` で、PDFをWebview上に表示し、ユーザーがcrop範囲を指定してPDFを出力する仕様を決める。

## 完了条件

- 対象入力を決める
  - 単一PDFのみか、複数PDFも扱うか
- ページ選択の扱いを決める
  - 1ページだけcropするのか
  - 指定範囲を全ページへ適用するのか
  - ページごとに異なる範囲を指定できるのか
- crop範囲の表現を決める
  - bbox
  - margin
  - その両方
- WebviewからHostへ送るmessage protocolを決める
- 出力先を `outputPath.cropPdf` で展開するか決める
- Safe Mode / Undo / progress / cancellation の扱いを決める
- `local/refactor-ddd-architecture` から参考にする内容と採用しない内容を記録する

## 変更可能なファイル

- `docs/specs/`
- `docs/tasks/0103-design-crop-pdf-manual-gui.md`
- 必要なら `docs/adr/`
- 必要なら `docs/tasks/README.md`

## 対象外

- 実装
- テスト追加
- localブランチのcherry-pick
- crop UIの見た目作り込み

## 関連

- [0102: PDF manual GUI機能の未実装範囲を整理する](0102-track-pdf-manual-gui-backlog.md)
- [auto-crop.md](../specs/auto-crop.md)

## 確認方法

- 仕様の未決事項が残っていないことを確認する
