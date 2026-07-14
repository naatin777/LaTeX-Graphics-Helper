# タスク: Playwright CIをscope判定へ接続する

## Status

Todo

## 目的

実装済みのCI scope classifierを使い、Playwright workflowを必要な変更でだけ実行するように接続する。最初の適用範囲をPlaywrightに限定し、効果と誤skipを測る。

## 完了条件

- workflow-level `paths` / `paths-ignore` でrequired checkをskipしていない
- classifier jobが常に走る
- 固定名の `playwright-gate` jobが常に走る
- browser Playwrightが不要な変更でskipされる
- Webview / Playwright / CI / unknown変更では必要に応じて実行される
- skipped jobがPR上でPendingにならないことを確認している
- branch protectionのrequired checkがmatrix jobではなく固定gate jobを参照できることを確認している
- 変更前後のActions時間を記録している

## 変更可能なファイル

- `.github/workflows/playwright.yml`
- 必要な `.github/scripts/`
- `docs/tasks/0175-wire-playwright-ci-scope.md`
- `docs/tasks/README.md`

## 対象外

- VS Code test workflowのscope化
- test分割
- external tool install条件の変更

## 関連

- [0174: CI scope classifierを実装する](0174-implement-ci-scope-classifier.md)

## 確認方法

- docs-only、Webview変更、unknown変更のPRでCI表示を確認する
- 必要なら `gh run view` でjob statusを確認する
- `git diff --check`
