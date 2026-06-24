# タスク: タスク管理をdocs/tasksへ統合する

## Status

Done

## 目的

`NEXT.md` と個別タスクファイルによる二重管理をなくし、タスク管理を `docs/tasks/` に統合する。

`PROJECT_STATE.md` はプロジェクト全体の現在地を示すファイルとしてルートに残す。

## 完了条件

- `NEXT.md` が削除されている
- `docs/tasks/README.md` から現在のタスクを確認できる
- 個別タスク用のテンプレートがある
- `NEXT.md` を参照していた文書が新しい運用へ更新されている
- `PROJECT_STATE.md` がプロジェクト全体の状態だけを扱っている

## 変更可能なファイル

- `AGENTS.md`
- `PROJECT_STATE.md`
- `NEXT.md`
- `docs/tasks/`
- `docs/adr/`
- `docs/ideas.md`
- `docs/rewrite-note.md`

## 対象外

- コードの変更
- 機能追加
- 外部のIssue管理ツールの導入

## 関連

- `docs/adr/0001-use-agents-md-for-codex-rules.md`
- `docs/adr/0004-manage-tasks-with-markdown.md`
- `docs/adr/0005-limit-codex-change-scope.md`

## 確認方法

- リポジトリ内に `NEXT.md` への有効な参照が残っていないことを確認する
- `docs/tasks/README.md` と個別タスクの役割が分離されていることを確認する
