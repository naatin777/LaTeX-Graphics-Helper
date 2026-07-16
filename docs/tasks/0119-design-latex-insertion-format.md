# タスク: LaTeX挿入フォーマットの仕様を決める

## Status

Todo

## 目的

PDF / 画像ファイルのdrag & drop、clipboard画像pasteで挿入するLaTeXコードの形式を決める。

PDF操作のquick / configureとは別系統として扱う。

## 背景

現行のLaTeX挿入では、`figure` / `subfigure` / `includegraphics` の候補や出力先設定を扱う。

一方で、将来的には `resizebox` などのwrapperが必要になる可能性がある。

PDF操作GUIの命名や実装と混ぜると仕様が膨らむため、LaTeX挿入の出力形式として別に決める。

## 完了条件

- drag & dropで挿入するLaTeXコードの基本形を決める
- clipboard画像pasteで保存先パスを入力する流れと、挿入するLaTeXコードの基本形を決める
- `includegraphics` だけで始めるか、`resizebox` も初期実装に含めるか決める
- settings.jsonで変更可能にする項目を決める
  - 保存先パス
  - placement
  - alignment
  - graphics options
  - subfigure options
  - wrapper候補
- command IDや設定名を `insertLatex.*` 系に寄せるか決める
- テスト追加タスクと実装タスクへ分ける

## 変更可能なファイル

- `docs/specs/`
- `docs/tasks/0119-design-latex-insertion-format.md`
- 必要なら `docs/adr/`
- 必要なら `docs/tasks/README.md`

## 対象外

- 実装
- テスト追加
- PDF crop / split / merge GUI

## 関連

- [0116: LaTeX挿入機能の失敗テストを追加する](0116-add-latex-insertion-settings-tests.md)
- [0117: ファイルdragとクリップボードpasteによるLaTeX挿入を復元する](0117-restore-latex-insertion-settings.md)
- [pdf-operation-command-modes.md](../specs/internal/pdf-operation-command-modes.md)

## 確認方法

- 仕様の未決事項が残っていないことを確認する
