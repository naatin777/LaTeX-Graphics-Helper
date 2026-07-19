# Tasks

## Current Task

- [0180: パッケージ済みVSIXのオフライン3 OS smoke testを追加する](0180-add-packaged-vsix-offline-smoke-tests.md)

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

## Backlog

ここにあるtaskは未着手または完了条件の再確認が必要な候補であり、Current Taskではない。Statusの変更や完了taskへの移動は、実装・Evidence・maintainer判断を確認してから行う。

### Verification pending

- [0180: パッケージ済みVSIXのオフライン3 OS smoke testを追加する](0180-add-packaged-vsix-offline-smoke-tests.md) - crop / merge / splitの実装とローカル確認はある。次回release workflowの3 OS確認待ち。

### Existing implementation and Evidence review

- [0106: splitPdf.configure GUIの仕様を決める](0106-design-split-pdf-configure-gui.md) - 現行実装あり。正式仕様との対応を再確認する。
- [0107: splitPdf.configure GUIの失敗テストを追加する](0107-add-split-pdf-configure-gui-tests.md) - Webview・protocol・operationのテストあり。taskのEvidence要件との対応を再確認する。
- [0108: splitPdf.configure GUIを実装する](0108-implement-split-pdf-configure-gui.md) - 現行実装あり。専用の完了記録が未整理。
- [0109: mergePdf GUIの仕様を決める](0109-design-merge-pdf-gui.md) - 現行実装あり。正式仕様との対応を再確認する。
- [0110: mergePdf GUIの失敗テストを追加する](0110-add-merge-pdf-gui-tests.md) - Webview・protocol・commandのテストあり。taskのEvidence要件との対応を再確認する。
- [0111: mergePdf GUIを実装する](0111-implement-merge-pdf-gui.md) - 現行実装あり。専用の完了記録が未整理。

### Product and architecture decisions

- [0096: 複数画像を1つのPDFへ結合する仕様を決める](0096-design-combine-images-to-single-pdf.md)
- [0097: PDFページを1つの画像へ結合する仕様を決める](0097-design-pdf-pages-to-single-image.md)
- [0099: Mermaid描画設定の仕様を決める](0099-design-mermaid-render-settings.md)
- [0119: LaTeX挿入フォーマットの仕様を決める](0119-design-latex-insertion-format.md)
- [0127: PDF処理バックエンドを比較評価する](0127-evaluate-pdf-processing-backends.md) - qpdfのCI導入とは別に、製品backendの採否判断が必要。
- [0128: 変換入力preflightの仕様を決める](0128-design-input-preflight-validation.md)
- [0129: 追加画像形式とEPS対応の仕様を決める](0129-design-additional-image-and-eps-formats.md)

### Migration and conditional maintenance

- [0098: 既存ペア別outputPath設定の移行方針を決める](0098-decide-pair-output-path-settings-migration.md) - 0089/0091の出力形式基準設定と重複するため、移行方針の要否を再確認する。
- [0100: editable Draw.io画像用の元ファイル名テンプレート変数を決める](0100-design-original-source-template-variables.md) - 現行の論理入力パス方針と重複するため、追加変数の要否を再確認する。
- [0101: sharp更新のDependabot対応を再評価する](0101-evaluate-sharp-dependabot-update.md) - Dependabot PRが再作成された場合に着手する条件付きtask。

### Quality and preflight tests

- [0134: splitPdfのoutputPath事前検証失敗テストを追加する](0134-add-split-output-path-preflight-tests.md)

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
