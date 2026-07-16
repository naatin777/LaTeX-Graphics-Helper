# Foundation

このdirectoryは、production codeを変更する前に、project全体の前提、品質、仕様、Evidence、toolingの不整合を整理するために使用する。

正式な利用者向け仕様の正本は`docs/specs/`、採用済みの永続判断は`docs/adr/`、現在の作業は`docs/tasks/`に置く。

ここへ置く文書は、原則として監査中のbaseline、観測、矛盾、Selection Gateであり、採用済み仕様やADRの代替ではない。

## Current audit

- [v1 development foundation audit](v1-development-foundation-audit.md): Problem Frame、主要所見、Selection Gate、全体readiness
- [capability catalog](capability-catalog.md): public capability、cross-cutting guarantee、delivery capability
- [spec / test trace](spec-test-trace.md): contract、implementation boundary、test、runtime、gap
- [test runtime inventory](test-runtime-inventory.md): Node、VS Code Host、Browser、Electron、packaging、platformの役割
- [test file inventory](test-file-inventory.md): repository treeから列挙した全test file / case、current runner、required runtime仮説
- [Browser / Electron overlap](browser-electron-overlap.md): Browser 18 statically declared casesとElectron case groupのoracle差・重複度
- [Evidence gaps](evidence-gaps.md): capability、spec、test、CI、platform、packagingの未接続
- [CI Evidence map](ci-evidence-map.md): Check、Test、Playwright、Release workflowとlocal scriptの意味
- [tooling file coverage](tooling-file-coverage.md): Oxlint、Oxfmt、TypeScript、Vitest、Lefthookの対象範囲
- [関連task 0198](../tasks/0198-audit-v1-development-foundation.md)
- [test tooling research](../research/v1-test-tooling-2026-07.md)

## Reading order

通常は次の順で読む。

1. `v1-development-foundation-audit.md`
2. 今回の判断に直接関係する詳細artifactだけ読む
3. 確定済みの正式仕様が必要な場合は`docs/specs/`へ移る
4. 採用理由が必要な場合は`docs/adr/`へ移る

すべてのfoundation文書を毎回読む必要はない。

## Rules

- 技術案をproblemや目的として確定しない。
- 観測、解釈、仮説、unknown、contradictionを分ける。
- 未決の選択には、候補、判定条件、必要Evidence、判断ownerを付ける。
- 初期調査の誤りを発見した場合は、隠さず訂正と原因を記録する。
- 採用判断が確定したら、必要な内容をspec、ADR、test policy、taskへ移す。
- このdirectoryを恒久的な第二の仕様置き場にしない。
