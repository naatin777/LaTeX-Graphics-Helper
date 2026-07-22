# Documentation

このdirectoryの文書は、正本、判断材料、履歴、作業管理を混ぜない。

## Canonical documents

- `glossary.md`: code、設定、UI、docsで使うcanonical vocabulary
- `naming-conventions.md`: directory、file、symbol、public surfaceの命名規則
- `specs/product/`: 利用者や外部から観測できる挙動の正本
- `specs/internal/`: module、protocol、staging、testなど内部contractの正本
- `adr/`: 複数moduleへ継続的に影響する採用済み設計判断と理由

## Work management

- `tasks/`: 達成する成果、進捗、verification、migrationの作業管理
- `refactor-backlog.md`: まだ実施しない改善候補と開始条件
- `ideas.md`: specまたはtaskへ移す前の未着手アイデア
- Task、backlog、ideaはproduct specやADRの代わりではない

## Evidence and history

- `research/`: 外部仕様、dependency、CLIの調査結果
- `records/`: 実験、監査、観測、判断材料、履歴記録
- `foundation/`: v1のbaseline、Evidence map、gap、Selection Gate
- `test-matrix.md`: test coverageの入口。詳細inventoryは`foundation/`が正本
- `rewrite-note.md`: 大きな作り直しを行う場合だけ使う履歴用メモ
- Research、record、foundationは現在有効なproduct specやADRではない

## Routing rule

1. 利用者に保証する結果は`specs/product/`へ置く。
2. 複数moduleが守る内部契約は`specs/internal/`へ置く。
3. なぜその設計を採用したかは`adr/`へ置く。
4. 現在変更する対象と完了条件は`tasks/`へ置く。
5. 外部調査や監査の観測は`research/`または`records/`へ置き、採用判断は正本へ反映する。
6. 未着手の案は`ideas.md`、実施条件付きの改善候補は`refactor-backlog.md`へ置く。
