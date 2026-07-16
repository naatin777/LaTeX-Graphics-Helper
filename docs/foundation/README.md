# Foundation

このdirectoryは、production codeを変更する前に、project全体の前提、品質、仕様、Evidence、toolingの不整合を整理するために使用する。

正式な利用者向け仕様の正本は`docs/specs/`、採用済みの永続判断は`docs/adr/`、現在の作業は`docs/tasks/`に置く。

ここへ置く文書は、原則として監査中のbaseline、観測、矛盾、Selection Gateであり、採用済み仕様やADRの代替ではない。

## Current audit

- [v1 development foundation audit](v1-development-foundation-audit.md)
- [関連task 0198](../tasks/0198-audit-v1-development-foundation.md)
- [test tooling research](../research/v1-test-tooling-2026-07.md)

## Rules

- 技術案をproblemや目的として確定しない。
- 観測、解釈、仮説、unknown、contradictionを分ける。
- 未決の選択には、候補、判定条件、必要Evidence、判断ownerを付ける。
- 採用判断が確定したら、必要な内容をspec、ADR、test policy、taskへ移す。
- このdirectoryを恒久的な第二の仕様置き場にしない。
