# タスク: READMEとtest matrixを最新実装に同期する

## Status

Todo

## 目的

出力形式基準コマンド、`outputPath.convertTo*`、CI整理後の状態に合わせて、READMEとtest matrixの記述ずれを確認・更新する。

## 完了条件

- `README.ja.md` が現在の実装以上の機能を盛っていない
- `README.md` が `README.ja.md` の自然な英訳になっている
- `docs/test-matrix.md` が主要な変換コマンドと対応入力形式を反映している
- 更新しない項目がある場合は理由を記録している

## 変更可能なファイル

- `README.ja.md`
- `README.md`
- `docs/test-matrix.md`
- 必要なら関連する `docs/specs/`
- `docs/tasks/0095-sync-readme-and-test-matrix-with-current-implementation.md`

## 対象外

- 実装変更
- テスト追加
- 新機能の仕様決定

## 関連

- [0088: 出力形式基準コマンド実装後の変換ドキュメントを同期する](0088-sync-conversion-docs-after-output-format-commands.md)
- [0091: 出力形式基準outputPath設定を実装する](0091-implement-output-format-output-path-settings.md)

## 確認方法

- `git diff --check`
