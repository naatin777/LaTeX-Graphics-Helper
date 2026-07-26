# ADR-0020: legacy pair-specific outputPath fallbackを維持する

## ステータス

置き換え済み

## 日付

2026-07-26

## 背景

出力形式基準の`outputPath.convertTo*`と`outputPaths.<command>`を追加した後も、既存利用者の設定には`outputPath.convertXToY`が残っている。新しい設定へ即時移行すると、v1で既存の出力先が変わる可能性がある。

## 決定

v1系ではlegacy pair-specific設定をfallbackとして維持する。出力pathの優先順位は次のとおりとする。

1. `outputPaths.<command>`
2. `outputPath.<command>`
3. 既存の`outputPath.convertXToY`
4. command固有のdefault

新しい設定例と今後の文書では`outputPaths.<command>`または`outputPath.<command>`を使用する。v1では既存設定をdeprecatedとして表示せず、利用者の設定を変更しない。

v2以降でlegacy fallbackを削除またはdeprecated化する場合は、別ADRで移行手順と影響を確定する。

## 理由

- v1で既存設定による出力先を変えない。
- 既存設定の利用状況を把握する仕組みなしに、警告や削除を追加しない。
- 新しい設定の優先順位は既存実装と一致しており、明示的な設定を優先できる。

## 結果・影響

- v1では設定項目が重複して見えるが、既存設定との互換性を保てる。
- 新しい設定が空の場合もlegacy fallbackが有効になる。
- legacy設定を削除する前に、major version変更として移行案を再確認する必要がある。

## 見直す条件

- v2の互換性方針を決めるとき
- legacy設定を明示的にdeprecated化または削除する要求が出たとき

## 関連

- `docs/specs/internal/output-format-conversion.md`
- `docs/tasks/0098-decide-pair-output-path-settings-migration.md`
- `docs/tasks/0100-design-original-source-template-variables.md`
- [ADR-0021](0021-use-pair-specific-output-path-settings.md)
