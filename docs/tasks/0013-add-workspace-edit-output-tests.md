# タスク: WorkspaceEdit出力反映の失敗テストを追加する

## Status

Done

## 目的

変換結果の複数出力とUndoの仕様を、実装前のVS Code統合テストとして固定する。

## 完了条件

- 複数出力が1回の操作で作成されるテストがある
- 1回のUndoで複数出力が削除されるテストがある
- Undo後も`.latex-graphics-helper/`内の完成ファイルが残ることを確認する
- VS CodeのWorkspaceEditとapplyEditをmockしない
- 未実装を理由としてテストが失敗することを確認する

## 変更可能なファイル

- `test/workspace_edit_output.test.ts`
- `docs/specs/workspace-edit-output-commit.md`
- `docs/test-matrix.md`
- `docs/tasks/README.md`
- `docs/tasks/0010-use-workspace-edit-for-output-commit.md`
- `docs/tasks/0013-add-workspace-edit-output-tests.md`

## 対象外

- WorkspaceEditによる出力反映の実装
- crop処理の変更
- safe modeの上書き確認UI

## 関連

- `docs/specs/workspace-edit-output-commit.md`
- `docs/adr/0006-use-workspace-staging-for-file-operations.md`
- `docs/tasks/0010-use-workspace-edit-for-output-commit.md`

## 確認方法

- `pnpm run check:test`
- 未実装のmoduleが存在しないため失敗することを確認する

## 実施結果

- VS Code本体のWorkspaceEditとworkspace.applyEditを使用する統合テストを追加した
- 複数出力の内容、1回のUndo、内部作業ファイルの保持をテスト対象にした
- `pnpm run check:test` は未実装の `src/presentation/commit_output_files.ts` が存在しないため、想定どおり失敗した
- 実装後のVS Code統合テストにより、Explorerへフォーカスしても `workspace.applyEdit` のファイル作成をUndoできないことが判明した
- 成立しない仕様を固定しないため、検証用テストは0010終了時に削除した
