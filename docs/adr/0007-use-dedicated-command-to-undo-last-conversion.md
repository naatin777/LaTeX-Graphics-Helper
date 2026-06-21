# ADR-0007: 直前の変換取消は専用commandで行う

## ステータス

採用

## 日付

2026-06-21

## 背景

変換結果の作成をVS Codeの通常Undoで戻すため、`vscode.WorkspaceEdit` を検証した。

`WorkspaceEdit.createFile` で複数のPDFを作成することはできたが、拡張APIの `workspace.applyEdit` によるファイル作成は、Explorerのファイル操作用Undo stackへ登録されなかった。

Explorerへフォーカスして通常のUndoを実行しても、作成したPDFは削除されなかった。

## 決定

通常のUndoキーは上書きしない。

変換完了通知の「取り消す」から、直前の変換結果だけを削除する専用commandを実行する。

## 安全条件

- 取消履歴はメモリ上に直前の1回分だけ保持する
- 拡張機能を再起動した後は取り消せない
- 生成時に各出力ファイルのSHA-256を記録する
- 取消前に全ファイルのworkspace境界とSHA-256を検証する
- ファイルの変更、欠損、workspace外へのsymlink変更が1件でもあれば、何も削除しない
- 全検証成功後に、今回生成した出力ファイルだけを削除する
- `.latex-graphics-helper/` 内の作業ファイルは削除しない
- 通常の `Ctrl+Z` / `Cmd+Z` へkeybindingを登録しない

## 理由

- ユーザーが期待する通常のUndoを奪わない
- 生成後に編集されたファイルを削除しない
- workspace外を誤って削除しない
- 取消対象を直前の変換だけに限定し、状態管理を小さく保てる

## 結果・影響

- 取消はVS Code標準Undoではなく、通知の操作として提供する
- 通知を閉じた後に備えて、専用command自体も登録する
- 次の変換が成功すると、前回の取消履歴は置き換わる
- 将来既存ファイルの上書きを許可する場合は、バックアップと復元を別仕様として設計する

## 関連

- `docs/adr/0006-use-workspace-staging-for-file-operations.md`
- `docs/tasks/0010-use-workspace-edit-for-output-commit.md`
- `docs/tasks/0014-add-safe-conversion-undo-tests.md`
- `docs/tasks/0015-implement-safe-conversion-undo.md`
