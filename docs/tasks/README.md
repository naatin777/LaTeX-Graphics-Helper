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

## Todo Tasks

- [0030: Safe Modeダイアログ結果のテストを追加する](0030-add-safe-mode-dialog-result-tests.md)
- [0031: Safe ModeのVS Code UIを手動確認する](0031-verify-safe-mode-ui-manually.md)
- [0032: 変換コマンドを出力形式基準へ再設計する](0032-redesign-conversion-commands-by-output-format.md)
