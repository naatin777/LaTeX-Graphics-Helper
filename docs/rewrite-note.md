# docs/rewrite-note.md

# Rewrite Note

作り直し・大きな整理をする場合にだけ使う。

## Why Rewrite

なぜ作り直すのか。

-

## Problems in Previous Version

前の実装で何がつらかったか。

-

## Keep

引き継ぐもの。

- 仕様
- 良かった挙動
- ユーザーに必要な機能

## Do Not Keep

引き継がないもの。

- 複雑すぎる構成
- 理解できない抽象化
- 目的が曖昧なリファクタ
- 不要なこだわり

## Rules for New Version

- MVPが動くまで大規模リファクタをしない。
- 1タスク1目的にする。
- AIには小さい単位で依頼する。
- 迷ったらADRに書く。
- 嫌になったら作業を小さくする。
- 気になる点は `docs/refactor-backlog.md` に逃がす。

## Success Criteria

作り直しが成功したと言える条件。

- 主要フローが動く。
- 自分が現在地を説明できる。
- `docs/tasks/README.md` からリンクされた現在のタスクに従って作業できる。
- Codexの変更差分をレビューできる。
