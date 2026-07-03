# ADR-0009: 変換コマンドは出力形式基準で公開する

## Status

Accepted

## Context

現在の変換コマンドは、`PNGをPDFに変換`、`SVGをPDFに変換`、`PDFをPNGに変換`のように、入力形式と出力形式の組み合わせごとに公開されている。

この方式では、対応形式が増えるほどcontext menuとCommand Paletteの項目が増える。

また、複数の異なる入力形式を同じ出力形式へ変換したい場合でも、入力形式ごとに別コマンドを実行する必要がある。

## Decision

公開する変換コマンドは、出力形式基準にする。

例:

- `PDFに変換`
- `PNGに変換`
- `JPEGに変換`
- `WebPに変換`
- `AVIFに変換`
- `SVGに変換`

既存の入力形式・出力形式ペア別コマンドは、公開UIから外す。

当初は移行直後に旧command IDを非公開aliasとして残してよいとしていた。

その後、v1.0.0では破壊的変更として旧command IDの互換aliasを実装しない方針に変更した。

詳細な移行表は`docs/specs/v1-migration-from-v051.md`に記録する。

## Consequences

- context menuの項目数を減らせる
- 異なる入力形式を同じ出力形式へまとめて変換できる
- command実行時に、選択された全ファイルが対象出力形式へ変換可能か検証する必要がある
- 旧command IDをkeybindingsやtasksで直接呼んでいるユーザーは、新command IDへ移行する必要がある
- 出力パス設定は、段階移行中は既存の変換ペア別設定を維持する
- Safe Mode、Undo、Progress、Cancellationは、1回の出力形式基準コマンド実行を1つの変換バッチとして扱う
- 全形式同時実装は避け、まず`PDFに変換`から段階的に移行する

## Related

- `docs/specs/output-format-conversion.md`
- `docs/specs/safe-mode.md`
- `docs/specs/conversion-progress-and-cancellation.md`
- `docs/tasks/0032-redesign-conversion-commands-by-output-format.md`
