# タスク: editable Draw.io画像用の元ファイル名テンプレート変数を決める

## Status

Todo

## 目的

editable Draw.io画像（`.drawio.png` / `.dio.png` / `.drawio.svg` / `.dio.svg`）で、元ファイル名や元拡張子を `outputPath` テンプレートから参照できる変数を追加するか決める。

## 完了条件

- 追加するテンプレート変数名を決める
- 既存の論理入力パス基準との関係を決める
- 通常ファイルでの挙動を決める
- 実装する場合の次タスクを作れる状態になっている

## 変更可能なファイル

- `docs/specs/output-format-conversion.md`
- `docs/tasks/0100-design-original-source-template-variables.md`
- 必要なら `docs/tasks/README.md`

## 対象外

- 実装
- テスト追加
- 既存テンプレート変数の意味変更

## 関連

- [0069: outputPathテンプレート変数の入力基準を整理する](0069-define-output-path-template-source-semantics.md)
- [output-format-conversion.md](../specs/output-format-conversion.md)

## 確認方法

- 追加する場合・しない場合の判断理由が記録されていることを確認する
