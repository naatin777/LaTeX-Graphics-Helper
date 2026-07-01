# タスク: commit messageとPR bodyの定型を決める

## Status

Done

## 目的

commit messageとPR bodyの書き方を定型化し、AIや人が毎回迷わず、レビューや履歴確認がしやすい形にする。

## 完了条件

- commit messageの形式をADRに記録する
- PR bodyの形式をADRに記録する
- GitHub PR templateを追加する
- AI向け作業ルールにcommit / PR方針を追加する
- タスク一覧にこのタスクを追加する

## 変更可能なファイル

- `.github/PULL_REQUEST_TEMPLATE.md`
- `AGENTS.md`
- `docs/adr/0011-define-language-policy-for-project-artifacts.md`
- `docs/tasks/0068-standardize-commit-and-pr-format.md`
- `docs/tasks/README.md`

## 対象外

- commitlintなどの自動検証導入
- 既存commit historyの書き換え
- 既存PR本文の修正

## 関連

- `docs/adr/0011-define-language-policy-for-project-artifacts.md`

## 確認方法

- `pnpm run check`
