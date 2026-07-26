# タスク: 既存ペア別outputPath設定の移行方針を決める

## Status

Done — 2026-07-26

## 目的

`outputPath.convertTo*` 実装後も残している既存ペア別 `outputPath.convertXToY` 設定を、今後どう扱うか決める。

## 完了条件

- 既存ペア別設定を維持する期間を決める
- deprecated表示やREADME上の説明方針を決める
- 削除しない場合の理由を記録する
- 削除・deprecated化する場合は影響と移行手順を記録する

## 決定

- legacy pair-specific設定はv1系の間、fallbackとして維持する。
- 優先順位は`outputPaths.<command>`、`outputPath.<command>`、legacy pair-specific設定、defaultの順とする。
- v1ではdeprecated表示を追加しない。新しい設定例では`outputPaths.<command>`または`outputPath.<command>`を使用する。
- 削除またはdeprecated化はv2以降の互換性判断へ分離する。
- 削除しない理由は、既存利用者の出力先をv1で変えず、利用状況のEvidenceなしに警告や削除を行わないためである。

永続判断は[ADR-0020](../adr/0020-preserve-legacy-output-path-fallback.md)に記録した。

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

- 移行判断がADRと内部specに記録され、現在のfallback実装の優先順位と一致することを確認した。
