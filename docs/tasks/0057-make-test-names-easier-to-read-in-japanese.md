# タスク: テスト名を日本語で分かりやすく整理する

## Status

Todo

## 目的

VS Code testの出力を見たときに、どの仕様が通っている・落ちているのかを日本語で把握しやすくする。

## 完了条件

- 主要なcommand testのテスト名を日本語で分かりやすくする方針を決める
- まず対象ファイルを限定して、テスト名・説明コメントだけを整理する
- 既存テストの期待値や実装は変更しない
- 変更後もテスト内容が同じであることを確認する

## 変更可能なファイル

- `docs/tasks/0057-make-test-names-easier-to-read-in-japanese.md`
- `docs/tasks/README.md`
- 対象として決めたtest file

## 対象外

- テストケースの追加・削除
- 実装変更
- テスト構造の大規模整理
- assertionの意味変更

## 確認方法

- `pnpm run check`
- 必要なら `pnpm run test`
