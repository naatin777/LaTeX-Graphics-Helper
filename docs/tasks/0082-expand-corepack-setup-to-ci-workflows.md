# タスク: Corepack方式のpnpm setupを他のCI workflowへ展開する

## Status

In Progress

## 目的

`check.yml` で効果が確認できたCorepack方式のpnpm setupを、他のGitHub Actions workflowへ展開してCI待ち時間を短縮する。

## 背景

`docs/tasks/0081-reduce-github-actions-dependency-setup-time.md` で、`check` jobは以下のように改善した。

- job全体: 38秒 → 25秒
- setup/install合計: 約29秒 → 約12秒

同じ `pnpm/action-setup` / `actions/setup-node` / `pnpm install --frozen-lockfile` の組み合わせは、test / playwright / release workflowでも使われている。

## 完了条件

- test Linux / macOS / Windows workflowへCorepack方式を展開する
- Playwright Linux / macOS / Windows workflowへCorepack方式を展開する
- release workflowへCorepack方式を展開するか判断し、必要なら展開する
- PR上のCIが通る
- 各workflowのstep時間を確認し、改善結果を記録する

## 変更可能なファイル

- `.github/workflows/test-linux.yml`
- `.github/workflows/test-macos.yml`
- `.github/workflows/test-windows.yml`
- `.github/workflows/playwright-linux.yml`
- `.github/workflows/playwright-macos.yml`
- `.github/workflows/playwright-windows.yml`
- `.github/workflows/release.yml`
- `docs/tasks/README.md`
- `docs/tasks/0082-expand-corepack-setup-to-ci-workflows.md`

## 対象外

- workflow統合
- `node_modules` cache導入
- test内容の変更
- dependency更新

## 確認方法

- GitHub Actionsの各workflow
