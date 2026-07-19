# Tasks

## Current Task

- なし

## Task boundaries

Taskは小さな作業手順やPR単位ではなく、達成する成果または意思決定を単位とする。

1つのtaskは複数のphase、experiment、PRを含んでよい。

次の理由だけでは新しいtaskを作成しない。

- PRやbranchが別になる
- localとCIで実行場所が異なる
- 実験結果の記録が必要
- script名を変更する
- policy文書を更新する
- maintainerによる判断が必要

新しいtaskへ分けるのは、次のいずれかを満たす場合とする。

- 単独で利用価値がある
- 必要な意思決定が独立している
- 変更範囲またはリスクが大きく異なる
- 別担当で並行して完了できる

## Planned

- 0198の監査結果から、test Evidence policy、test directory、Browser / Electronの役割、Oxlint、Skill routingの判断taskを分離する

## Blocked

- なし

## Recent Completed

- [0201: Node-level testの実行基盤を決定する](0201-decide-node-test-runtime.md)
- [0200: Node test runtimeを小規模検証する](0200-experiment-node-test-runtime.md)
- [0199: v1 test Evidence inventoryを完了する](0199-complete-test-evidence-inventory.md)
- [0198: v1開発基盤の前提を監査する](0198-audit-v1-development-foundation.md)
- [0197: CI・Playwright・VSIX releaseを4 workflowへ整理する](0197-verify-cross-platform-vsix-release.md)
- [0195: README・NLS・設定・task archiveを同期する](0195-sync-docs-settings-and-task-archive.md)
- [0196: v1構造とハーネスを簡素化する](0196-simplify-v1-architecture-and-harness.md)

## Archive

- [完了task archive](archive/completed.md)

個別のtask fileは削除せず、archiveから参照できる番号範囲に整理する。
