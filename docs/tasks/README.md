# Tasks

## Current Task

- [0197: cross-platform VSIX release verification](0197-verify-cross-platform-vsix-release.md)

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
- [0195: README・NLS・設定・task archiveを同期する](0195-sync-docs-settings-and-task-archive.md)（未着手）

## Blocked

- [0194: CI・release・VSIX packagingを再現可能にする](0194-harden-ci-release-and-vsix.md)（他OS runnerでのpackageおよびpackaged VSIX smokeが未確認）

## Recent Completed

- [0201: Node-level testの実行基盤を決定する](0201-decide-node-test-runtime.md)
- [0200: Node test runtimeを小規模検証する](0200-experiment-node-test-runtime.md)
- [0199: v1 test Evidence inventoryを完了する](0199-complete-test-evidence-inventory.md)
- [0198: v1開発基盤の前提を監査する](0198-audit-v1-development-foundation.md)
- [0196: v1構造とハーネスを簡素化する](0196-simplify-v1-architecture-and-harness.md)
- [0193: Webviewのprotocol・CSP・i18n・性能を改善する](0193-harden-webview-boundaries-and-performance.md)
- [0192: LaTeX Drop/Pasteの入力仕様を明確化する](0192-harden-latex-drop-and-paste.md)
- [0191: raster operationの共通pipelineを整理する](0191-reduce-raster-operation-review-surface.md)
- [0190: 変換commandの共通境界を小さく整理する](0190-reduce-conversion-command-review-surface.md)
- [0189: Safe Mode・command境界・Output Channelを統一する](0189-align-command-boundaries-and-output-channel.md)
- [0188: AIハーネスとStop hookを検証専用にする](0188-build-task-preflight-and-stop-harness.md)
- [0187: Clipboard Pasteのcancellationとcleanupを統合する](0187-harden-clipboard-paste-lifecycle.md)
- [0186: session-safeなstaging lifecycleを実装する](0186-define-session-safe-staging-lifecycle.md)

## Archive

- [完了task archive](archive/completed.md)

個別のtask fileは削除せず、archiveから参照できる番号範囲に整理する。
