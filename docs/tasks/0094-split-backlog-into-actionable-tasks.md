# タスク: 未実装・保留事項を個別タスクへ分割する

## Status

Done

## 目的

0048で整理した未実装・保留事項を、次に選べる個別タスクへ分割する。

## 完了条件

- 保留事項が個別タスクとして作成されている
- `docs/tasks/README.md` のTodoに追加されている
- 0048の保留一覧から個別タスクへリンクされている

## 変更可能なファイル

- `docs/tasks/0048-track-unimplemented-work.md`
- `docs/tasks/README.md`
- `docs/tasks/0094-split-backlog-into-actionable-tasks.md`
- 新規 `docs/tasks/*.md`

## 対象外

- 保留機能の実装
- 仕様の最終決定
- READMEやtest matrixの実更新
- dependency更新

## 関連

- [0048: 未実装・保留事項を整理する](0048-track-unimplemented-work.md)

## 確認方法

- `git diff --check`
- `docs/tasks/README.md` のTodo確認
