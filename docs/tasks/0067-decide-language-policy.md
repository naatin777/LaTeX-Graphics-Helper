# タスク: プロジェクト成果物ごとの言語方針を決める

## Status

Done

## 目的

英語で書くもの、日本語で書くもの、どちらでもよいものを明確にし、AIや人が都度迷わず作業できるようにする。

## 完了条件

- プロジェクト成果物ごとの言語方針をADRに記録する
- `PROJECT_STATE.md` から言語方針の決定を参照できる
- `AGENTS.md` からAI向けの言語方針を参照できる
- タスク一覧にこのタスクを追加する

## 変更可能なファイル

- `docs/adr/`
- `docs/tasks/`
- `PROJECT_STATE.md`
- `AGENTS.md`

## 対象外

- 既存ドキュメント本文の一括翻訳
- 既存テスト名の変更
- UI文言の変更
- README / CHANGELOGの更新

## 関連

- `docs/adr/0002-use-japanese-as-source-for-docs.md`
- `docs/adr/0011-define-language-policy-for-project-artifacts.md`

## 確認方法

- `pnpm run check`
