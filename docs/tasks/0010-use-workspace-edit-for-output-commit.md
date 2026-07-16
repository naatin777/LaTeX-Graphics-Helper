# タスク: 変換結果の反映をWorkspaceEdit対応する

## Status

Done

## 目的

`.latex-graphics-helper/` で完成した変換後ファイルを指定出力先へ反映する操作を、VS CodeのUndo対象にする。

ユーザーには「変換前から変換後への変更」だけを意識させ、内部作業領域はUndo対象として扱わない。

## 完了条件

- 完成ファイルの出力反映に `vscode.WorkspaceEdit` を使用する
- Explorerへフォーカスした状態のVS CodeのUndoで、変換後ファイルの作成を戻せる
- `.latex-graphics-helper/` 内の作業ファイルはUndo対象外である
- 複数出力を1回の操作として扱う

## 変更可能なファイル

- `src/presentation/commit_output_files.ts`
- `src/commands/crop_pdf_auto.ts`
- `src/operations/crop_pdf_auto.ts`
- `docs/specs/internal/auto-crop.md`
- `docs/specs/workspace-edit-output-commit.md`
- `docs/test-matrix.md`
- `docs/tasks/README.md`
- `docs/tasks/0010-use-workspace-edit-for-output-commit.md`

## 対象外

- `.latex-graphics-helper/` の削除やUndo
- safe modeの上書き確認UI

## 関連

- `docs/adr/0006-use-workspace-staging-for-file-operations.md`
- `docs/tasks/0008-implement-safe-auto-crop.md`
- `docs/tasks/0013-add-workspace-edit-output-tests.md`

## 確認方法

- VS Code統合テスト
- 手動でUndo動作を確認する

## 実施結果

- `WorkspaceEdit.createFile` による複数PDFの作成自体は成功した
- 通常のUndoとExplorerへフォーカスしたUndoの両方をVS Code統合テストで確認した
- 拡張APIの `workspace.applyEdit` によるファイル作成はExplorerのファイル操作用Undo stackへ登録されず、要求したUndo動作を実現できなかった
- 通常のUndoキーを拡張機能で上書きすると、他のファイル操作のUndoを奪うため採用しない
- 実装途中のWorkspaceEdit対応と、成立しない期待を持つテストは削除した

## 結論

WorkspaceEdit方式は不採用とする。

代わりに、生成時のhashと一致する場合だけ直前の変換結果を削除する専用commandを実装する。
