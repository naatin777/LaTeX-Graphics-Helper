# タスク: GitHub Actionsの重複表示を減らす

## Status

Done

## 目的

docs-only判定のためにOS別workflowごとへ追加された `changes` job により、GitHub Actionsの表示が増えすぎている状態を整理する。

## 完了条件

- VS Code integration test workflowを1つに統合し、OS差はmatrixで扱う
- Playwright workflowを1つに統合し、OS差はmatrixで扱う
- `changes` jobは各統合workflowにつき1つだけにする
- 既存のdocs-only skip方針は維持する
- 既存のOS別実行内容を維持する

## 変更可能なファイル

- `.github/workflows/`
- `docs/tasks/README.md`
- `docs/tasks/0093-consolidate-ci-workflows.md`

## 対象外

- CI実行時間の追加最適化
- required check設定の変更
- テスト内容の変更
- workflow以外の実装変更

## 関連

- [0092: docs-only変更では重いCIをスキップする](0092-skip-heavy-ci-for-docs-only-changes.md)

## 確認方法

- `git diff --check`
- workflow YAMLの差分確認
- Ruby/Psychによるworkflow YAML parse確認

## 実装内容

- OS別のVS Code integration test workflowを `.github/workflows/test.yml` に統合した
- OS別のPlaywright workflowを `.github/workflows/playwright.yml` に統合した
- 各統合workflowの `changes` job を1つにした
- OSごとの違いはmatrixと条件付きstepで維持した
