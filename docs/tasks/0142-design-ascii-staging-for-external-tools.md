# タスク: 外部コマンド用ASCII stagingの仕様を決める

## Status

Todo

## 目的

Unicode pathを安全に扱えないことが実測で確認された外部コマンドについて、ASCII名の作業領域で処理し、ユーザー指定pathへ正しい名前で反映する共通方針を決める。

## 完了条件

- タスク0141の実測結果を根拠に、staging対象コマンドを限定する
- workspace内の`.latex-graphics-helper`を作業領域とする
- 入力を衝突しないASCII名へコピーし、外部コマンドの出力もASCII名で受ける
- 最終反映時に元のoutputPathへ対応づける方法を決める
- Safe Mode、Undo、cancel、複数入力、途中失敗時のcleanupとの関係を決める
- path mappingをログへ出す場合に、ユーザーpathと内部pathを混同しない方針を決める
- 正常系と失敗系のテスト計画を作る
- 設計判断が複数機能へ影響する場合はADRへ記録する

## 変更可能なファイル

- `docs/tasks/README.md`
- `docs/tasks/0142-design-ascii-staging-for-external-tools.md`
- `docs/specs/`
- `docs/adr/`
- `docs/research/`

## 対象外

- ASCII stagingの実装
- 実測で問題がないコマンドへの一律適用
- workspace外での一時ファイル作成
- outputPathの自動変更

## 関連

- [外部コマンドのOS別path互換性を実測する](0141-audit-external-tool-path-compatibility.md)
- [ファイル変換はworkspace内の作業領域で行う](../adr/0006-use-workspace-staging-for-file-operations.md)

## 確認方法

- タスク0141の結果と対象コマンドが一致することを確認する
- Safe Mode、Undo、cancel、cleanupの各仕様との矛盾がないことを確認する
