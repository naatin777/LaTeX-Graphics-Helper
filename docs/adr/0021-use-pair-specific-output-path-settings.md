# ADR-0021: pair-specific outputPath設定を正本にする

## ステータス

採用

## 日付

2026-07-26

## 背景

command IDは出力形式基準の`convertToPdf`、`convertToPng`などへ統合されている。一方、出力先は入力形式と出力形式の組み合わせごとに決める必要があり、形式基準の共通設定では入力ごとの出力粒度を表現しにくい。

## 決定

command IDとoutput path設定の命名を分離する。

- command IDは`convertToPdf`などの出力形式基準を維持する。
- 単一出力（templateに`${page}`を含まない）は`outputPath.convertXToY`を使う。
- 複数出力（templateに`${page}`を含む）は`outputPaths` objectの`convertXToY` entryを使う。
- `outputPath.convertToY`と、`outputPaths` object内の`convertToY` entryは使用しない。
- 専用commandに閉じた`convertImagesToSinglePdf`、`convertToRaw`、`convertToDrawio`、`convertDrawioToPdfDirectly`などの設定は専用commandの設定として維持する。

## 理由

- output pathが入力形式と出力形式の両方を明示する。
- `${page}`を含む複数出力と単一出力を設定の型で区別できる。
- commandの公開名を変えず、出力先設定だけを正しい粒度へ揃えられる。

## 結果・影響

- 既存のpair-specific設定が正本になる。
- 形式基準の一般変換設定はmanifestから外れ、設定しても使用されない。専用commandの設定はこの決定の対象外とする。
- multi-page設定を変更する場合は`outputPaths` objectのpair keyを変更する。

## 関連

- [ADR-0020](0020-preserve-legacy-output-path-fallback.md)
- `docs/specs/internal/output-format-conversion.md`
- `docs/tasks/0098-decide-pair-output-path-settings-migration.md`
