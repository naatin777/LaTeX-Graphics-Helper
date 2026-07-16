# タスク: 既存ペア別outputPath設定の移行方針を決める

## Status

Todo

## 目的

`outputPath.convertTo*` 実装後も残している既存ペア別 `outputPath.convertXToY` 設定を、今後どう扱うか決める。

## 完了条件

- 既存ペア別設定を維持する期間を決める
- deprecated表示やREADME上の説明方針を決める
- 削除しない場合の理由を記録する
- 削除・deprecated化する場合は影響と移行手順を記録する

## 変更可能なファイル

- `docs/specs/internal/output-format-conversion.md`
- `docs/adr/`
- `docs/tasks/0098-decide-pair-output-path-settings-migration.md`
- 必要なら `docs/tasks/README.md`

## 対象外

- 既存設定の削除
- package.jsonの設定変更
- README更新

## 関連

- [0089: 出力形式基準のoutputPath設定移行方針を決める](0089-design-output-format-output-path-settings.md)
- [0091: 出力形式基準outputPath設定を実装する](0091-implement-output-format-output-path-settings.md)

## 確認方法

- 移行判断がADRまたはspecに記録されていることを確認する
