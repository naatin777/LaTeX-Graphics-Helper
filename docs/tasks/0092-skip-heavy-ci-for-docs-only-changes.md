# タスク: docs-only変更では重いCIをスキップする

## Status

Done

## 目的

docsのみの変更で、PlaywrightとVS Code integration testを全OSで実行しないようにする。

## 背景

仕様・タスク・READMEだけを変更するPRでも、現在はPlaywrightとVS Code integration testがLinux / macOS / Windowsで実行される。

docs-only変更では変換処理やWebview挙動は変わらないため、重いテストを毎回実行する費用対効果が低い。

一方で、workflow自体を `paths-ignore` で起動しない形にすると、required checkとの整合性が分かりにくくなる可能性がある。

そのため、workflowは起動し、docs-only判定jobの結果により重いjobだけをskipする。

## やること

- docs-only判定スクリプトを追加する
- `test-*` workflowでdocs-onlyの場合に `vscode-test` jobをskipする
- `playwright-*` workflowでdocs-onlyの場合に `playwright` jobをskipする
- `check` workflowは残す

## 完了条件

- docs-only変更でPlaywright / vscode-test jobがskipされる設定になっている
- docs以外、またはworkflow変更を含む場合はPlaywright / vscode-test jobが実行される設定になっている
- `git diff --check` が通る

## 変更可能なファイル

- `.github/workflows/`
- `.github/scripts/`
- `docs/tasks/0092-skip-heavy-ci-for-docs-only-changes.md`
- `docs/tasks/README.md`

## 対象外

- `check` workflowのskip
- required check設定の変更
- テスト内容の変更
- CI高速化のためのdependency更新

## 関連

- `docs/tasks/0081-reduce-github-actions-dependency-setup-time.md`
- `docs/tasks/0087-remove-temporary-ci-timing-wrappers.md`

## 確認方法

- `git diff --check`
- PR上でworkflow変更を含むため、通常どおりPlaywright / vscode-testが実行されることを確認する

## 実装内容

- docs-only判定スクリプト `.github/scripts/detect-docs-only.sh` を追加した
- `test-*` workflowでdocs-onlyの場合に `vscode-test` jobをskipするようにした
- `playwright-*` workflowでdocs-onlyの場合に `playwright` jobをskipするようにした
- `check` workflowは常に実行する方針のままにした
- workflow変更を含むPRではdocs-only扱いにならないことをローカルで確認した
- git diffの取得に失敗した場合は、安全側としてdocs-only扱いにせず重いCIを実行するようにした
