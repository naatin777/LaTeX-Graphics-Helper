# タスク: GitHub Actionsのdependency setup時間を削減する

## Status

Done

## 検証結果

採用する。

PR #290 の `check` jobで、`pnpm/action-setup` をCorepack方式へ置き換えた結果、job全体の時間が短縮した。

変更前のPR #289:

- job全体: 38秒
- `pnpm/action-setup`: 14秒
- `actions/setup-node`: 8秒
- `pnpm install --frozen-lockfile`: 7秒
- setup/install合計: 約29秒

変更後のPR #290:

- job全体: 25秒
- `corepack enable`: 0秒
- `corepack prepare pnpm@11.8.0 --activate`: 0秒
- `actions/setup-node`: 2秒
- `pnpm install --frozen-lockfile`: 10秒
- setup/install合計: 約12秒

`pnpm install` は少し増えたが、`pnpm/action-setup` と `actions/setup-node` が大きく短縮されたため、全体では改善した。

次は `docs/tasks/0082-expand-corepack-setup-to-ci-workflows.md` で、他のCI workflowへ展開する。

## 目的

GitHub Actionsで `pnpm/action-setup`、`actions/setup-node`、`pnpm install --frozen-lockfile` に時間がかかっているため、PRのCI待ち時間を短くできるか検証する。

## 背景

PR #289 の実測では、setup/install時間が特にWindowsとmacOSで大きかった。

- check: setup/install合計 約29秒
- vscode-test Windows: setup/install合計 約64秒
- playwright Windows: setup/install合計 約56秒

ただし、workflowを統合すると並列性が落ち、PR完了待ち時間が伸びる可能性がある。
そのため、まずは1 workflowでdependency setup自体を軽くできるか検証する。

## 完了条件

- `check.yml` で `pnpm/action-setup` を使わないCorepack方式を試す
- CI上で `check` が通る
- `check` jobのstep時間を確認し、改善するかを記録する
- 改善が確認できた場合のみ、他workflowへの展開を別タスク化または追加実施する
- 改善しない場合は、不採用理由を記録する

## 変更可能なファイル

- `.github/workflows/check.yml`
- `docs/tasks/README.md`
- `docs/tasks/0081-reduce-github-actions-dependency-setup-time.md`

## 対象外

- vscode-test / Playwright workflowへの展開
- workflow統合
- `node_modules` cache導入
- dependency更新
- test内容の変更

## 確認方法

- GitHub Actionsの `check`
