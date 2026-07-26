# タスク: editable Draw.io画像用の元ファイル名テンプレート変数を決める

## Status

Done — 2026-07-26

## 目的

editable Draw.io画像（`.drawio.png` / `.dio.png` / `.drawio.svg` / `.dio.svg`）で、元ファイル名や元拡張子を `outputPath` テンプレートから参照できる変数を追加するか決める。

## 完了条件

- 追加するテンプレート変数名を決める
- 既存の論理入力パス基準との関係を決める
- 通常ファイルでの挙動を決める
- 実装する場合の次タスクを作れる状態になっている

## 決定

元ファイルpath専用のtemplate変数は追加しない。editable Draw.io画像では既存の論理入力pathが`.drawio`または`.dio`のwrapper suffixを除いており、`${file}`、`${fileBasename}`、`${fileBasenameNoExtension}`などの既存変数で出力名を決められるためである。

通常ファイルでは論理入力pathは元の入力pathと同じであり、既存template変数の意味を変更しない。rawのeditable Draw.io画像pathを別名で参照する要求が出た場合は、入力path semanticsとLaTeX用途への影響を確認する独立taskに分ける。

## 変更可能なファイル

- `docs/specs/internal/output-format-conversion.md`
- `docs/tasks/0100-design-original-source-template-variables.md`
- 必要なら `docs/tasks/README.md`

## 対象外

- 実装
- テスト追加
- 既存テンプレート変数の意味変更

## 関連

- [0069: outputPathテンプレート変数の入力基準を整理する](0069-define-output-path-template-source-semantics.md)
- [output-format-conversion.md](../specs/internal/output-format-conversion.md)

## 確認方法

- 追加しない判断理由と、editable Draw.io画像・通常ファイルの挙動を内部specへ記録した。
