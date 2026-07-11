# タスク: 外部コマンド用ASCII stagingの仕様を決める

## Status

Done

## 目的

Unicode pathを安全に扱えないことが実測で確認された外部コマンドについて、ASCII名の作業領域で処理し、ユーザー指定pathへ正しい名前で反映する共通方針を決める。

## 完了条件

- タスク0141の実測結果を根拠に、staging対象コマンドを限定する
- 外部コマンドへ直接渡すscratchは検証済みOS一時directoryに置く
- Safe Mode、Undo、backup、完成fileのtransaction stagingはworkspace内に維持する
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
- [Unicode非互換のWindows外部コマンドにはOS一時scratchを使う](../adr/0012-use-os-temp-for-incompatible-windows-tools.md)
- [外部コマンド用ASCII scratch仕様](../specs/external-tool-ascii-scratch.md)

## 確認方法

- タスク0141の結果と対象コマンドが一致することを確認する
- Safe Mode、Undo、cancel、cleanupの各仕様との矛盾がないことを確認する

## 確認結果

- WindowsのGhostscript、pdftocairo、rsvg-convertだけを対象にした
- Unicode workspaceへ対応するため、tool scratchだけをOS一時directoryへ置く方針にした
- Safe Mode、Undo、backup、完成fileのtransaction stagingはworkspace内に維持した
- `os.tmpdir()`が非ASCIIの場合はASCIIの`SystemRoot\\Temp`をfallback候補とし、両方使えなければ実行前エラーにした
- scratchの境界、固定ASCII名、成功判定、cleanup、ログ、複数入力、cancelの仕様を定義した
- 3 toolの正常系と失敗系を後続タスク0143から0148でテスト・実装する計画を定義した
