# Tasks

タスクは、1タスクにつき1つのMarkdownファイルで管理する。

新しいタスクは `0000-template.md` をコピーして作成する。

## Current Task

なし。

## Rules

- 作業中のタスクは1つに限定する
- タスクの目的を途中で増やさない
- 完了条件を満たしたら `Status` を `Done` にする
- 残った作業は別のタスクとして作成する
- 仕様に関係する場合は `docs/specs/` をリンクする
- 設計判断に関係する場合は `docs/adr/` をリンクする

## Completed Tasks

- [0001: タスク管理をdocs/tasksへ統合する](0001-consolidate-task-management.md)
- [0002: 検証ベースラインを確立する](0002-establish-validation-baseline.md)
- [0003: lintのPDF.js worker importエラーを解消する](0003-fix-pdfjs-worker-lint-errors.md)
- [0004: 標準のtestコマンドを決定する](0004-decide-standard-test-command.md)
- [0005: WebviewのPDF表示テストを先行追加する](0005-add-failing-webview-pdf-rendering-tests.md)
- [0006: WebviewにPDFの最初のページを表示する](0006-render-first-pdf-page-in-webviews.md)
- [0007: WebviewのPDF表示内容検証を強化する](0007-strengthen-webview-pdf-rendering-tests.md)
- [0008: cropPdf.autoを安全な作業領域で実装する](0008-implement-safe-auto-crop.md)
- [0009: ファイル操作をworkspace内へ制限する](0009-restrict-file-operations-to-workspace.md)
- [0011: cropPdf.autoを単純で安全な構成へ変更する](0011-simplify-auto-crop.md)
- [0012: workspace境界の失敗テストを追加する](0012-add-workspace-boundary-tests.md)
- [0013: WorkspaceEdit出力反映の失敗テストを追加する](0013-add-workspace-edit-output-tests.md)
- [0014: 安全な変換取消の失敗テストを追加する](0014-add-safe-conversion-undo-tests.md)
- [0015: 安全な直前変換取消を実装する](0015-implement-safe-conversion-undo.md)
- [0016: 変換キャンセルの失敗テストを追加する](0016-add-conversion-cancellation-tests.md)
- [0017: 変換の進捗表示とキャンセルを実装する](0017-implement-conversion-progress-and-cancellation.md)
- [0018: splitPdf.allPagesの失敗テストを追加する](0018-add-split-pdf-all-pages-tests.md)
- [0019: splitPdf.allPagesを安全に実装する](0019-implement-split-pdf-all-pages.md)
- [0020: Ghostscriptがない場合のエラーハンドリングをテストする](0020-add-ghostscript-missing-error-test.md)
- [0021: Outputチャンネルへのログ出力機能を実装する](0021-implement-output-channel-logging.md)
- [0022: PNGをPDFに変換する機能のテストを追加する](0022-add-png-to-pdf-conversion-tests.md)
- [0023: PNGをPDFに変換する機能を実装する](0023-implement-png-to-pdf-conversion.md)
- [0024: コマンドを呼び出してファイル変換できてるかをチェックするテストを追加する](0024-add-command-execution-test.md)
- [0025: 生成されたmediaフォルダをGit管理から外す](0025-ignore-generated-media.md)
- [0026: Safe Modeの失敗テストを追加する](0026-add-safe-mode-tests.md)
- [0027: Safe Modeをcropとsplitへ実装する](0027-implement-safe-mode.md)
- [0028: PNG変換のSafe Mode失敗テストを追加する](0028-add-png-safe-mode-tests.md)
- [0029: PNG変換を安全な作業領域とSafe Modeへ統合する](0029-integrate-png-conversion-with-safe-mode.md)
- [0030: Safe Modeダイアログ結果のテストを追加する](0030-add-safe-mode-dialog-result-tests.md)
- [0031: Safe ModeのVS Code UI挙動を自動テストする](0031-verify-safe-mode-ui-manually.md)
- [0032: 変換コマンドを出力形式基準へ再設計する](0032-redesign-conversion-commands-by-output-format.md)
- [0033: RuleSyncでAI作業ルールを一元管理する](0033-adopt-rulesync-for-ai-rules.md)
- [0034: PDFに変換コマンドの失敗テストを追加する](0034-add-convert-to-pdf-output-format-tests.md)
- [0035: PDFに変換コマンドを実装する](0035-implement-convert-to-pdf-output-format-command.md)
- [0036: VS Code command testの通知待ち対策helperを追加する](0036-add-command-test-notification-helper.md)
- [0037: RuleSyncのStop hookでlint/format自動修正を実行する](0037-add-rulesync-stop-fix-hook.md)
- [0038: Codex Stop hookのJSON出力エラーを修正する](0038-fix-codex-stop-hook-json-output.md)
- [0039: macOS CIでconvert PNG to PDF command testがtimeoutする問題を修正する](0039-fix-macos-convert-png-command-timeout.md)
- [0040: 変換サブメニューのPDF表示へ移行する失敗テストを追加する](0040-add-legacy-to-pdf-command-visibility-tests.md)
- [0041: 変換サブメニューのPDF表示へ移行する](0041-implement-convert-menu-pdf-visibility.md)
- [0042: 実行可能な変換context menuを共有サブメニューへ集約する](0042-consolidate-existing-convert-context-menu.md)
- [0043: JPEG/WebP/AVIFをPDFに変換する失敗テストを追加する](0043-add-convert-to-pdf-image-format-tests.md)
- [0044: JPEG/WebP/AVIFをPDFに変換する](0044-implement-convert-to-pdf-image-formats.md)
- [0045: SVGをPDFに変換する失敗テストを追加する](0045-add-convert-to-pdf-svg-tests.md)
- [0046: SVGをPDFに変換する](0046-implement-convert-to-pdf-svg.md)
- [0047: Mermaidファイル変換の仕様を決める](0047-design-mermaid-file-conversion.md)
- [0048: 未実装・保留事項を整理する](0048-track-unimplemented-work.md)
- [0049: MermaidをSVGに変換する失敗テストを追加する](0049-add-convert-to-svg-mermaid-tests.md)
- [0050: MermaidをSVGに変換する](0050-implement-convert-to-svg-mermaid.md)
- [0051: MermaidをPDFに変換する失敗テストを追加する](0051-add-convert-to-pdf-mermaid-tests.md)
- [0052: MermaidをPDFに変換する](0052-implement-convert-to-pdf-mermaid.md)
- [0053: editable Draw.io画像をPDF変換対象にする失敗テストを追加する](0053-add-editable-drawio-image-to-pdf-tests.md)
- [0054: editable Draw.io画像をPDF変換対象にする](0054-implement-editable-drawio-image-to-pdf.md)
- [0055: editable Draw.io画像のSafe Mode・Undo・cancelテストを追加する](0055-add-editable-drawio-image-flow-tests.md)
- [0056: 大文字拡張子の扱いを全体確認する](0056-audit-uppercase-extension-handling.md)
- [0057: テスト名を日本語で分かりやすく整理する](0057-make-test-names-easier-to-read-in-japanese.md)
- [0058: 変換context menuの拡張子判定を大文字小文字非依存にする](0058-make-convert-context-menu-extension-matching-case-insensitive.md)
- [0059: テスト名を全体的に日本語化する](0059-localize-test-names-broadly.md)
- [0060: pnpm実行時にnode_modulesが再作成される問題を調査する](0060-investigate-pnpm-node-modules-recreation.md)
- [0061: pnpm 11向けに設定置き場とdeps status checkを整理する](0061-align-pnpm-config-for-v11-deps-status.md)
- [0062: 変換機能ドキュメントを現在の実装に合わせる](0062-update-conversion-docs.md)
- [0063: convertToPngの仕様を決める](0063-design-convert-to-png.md)
- [0064: convertToPngの失敗テストを追加する](0064-add-convert-to-png-tests.md)
- [0065: convertToPngを実装する](0065-implement-convert-to-png.md)
- [0066: GitHub Actionsで外部変換ツールを実体確認する](0066-verify-ci-external-tools.md)
- [0067: プロジェクト成果物ごとの言語方針を決める](0067-decide-language-policy.md)
- [0068: commit messageとPR bodyの定型を決める](0068-standardize-commit-and-pr-format.md)
- [0069: outputPathテンプレート変数の入力基準を整理する](0069-define-output-path-template-source-semantics.md)
- [0070: convertToJpegの失敗テストを追加する](0070-add-convert-to-jpeg-tests.md)
- [0071: convertToJpegを実装する](0071-implement-convert-to-jpeg.md)
- [0072: 変換テストのfixture方針を記録する](0072-document-test-fixture-policy.md)
- [0073: convertToSvgの入力形式をPDFとDraw.ioへ広げる](0073-expand-convert-to-svg-inputs.md)
- [0074: convertToWebpを実装する](0074-implement-convert-to-webp.md)
- [0075: convertToAvifを実装する](0075-implement-convert-to-avif.md)
- [0076: withProgress cancellation handlingを共通化する](0076-common-progress-cancellation.md)
- [0077: Playwrightテストをsrc配下から移動する](0077-relocate-playwright-tests.md)
- [0079: vscode-testをshard並列実行できるか検証する](0079-vscode-test-sharding.md)
- [0080: VS Code integration testで各テストの所要時間を表示する](0080-show-vscode-test-durations.md)
- [0081: GitHub Actionsのdependency setup時間を削減する](0081-reduce-github-actions-dependency-setup-time.md)

## Todo Tasks

- [0078: progressとnotification文言を多言語対応する](0078-localize-progress-and-notification-messages.md)
- [0082: Corepack方式のpnpm setupを他のCI workflowへ展開する](0082-expand-corepack-setup-to-ci-workflows.md)
