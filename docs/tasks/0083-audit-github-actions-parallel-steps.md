# タスク: GitHub Actions parallel stepsの適用候補を調査する

## Status

Done

## 目的

GitHub Actionsのstep並列実行機能を、このプロジェクトのCI高速化に使えるか調査する。

## 調査結果

すぐに一律導入しない。

GitHub Actionsのparallel stepsは、同一job内で依存関係のないstepを並列実行する機能である。
そのため、`pnpm` setup、`actions/setup-node`、`pnpm install --frozen-lockfile`、test実行のような順序依存がある処理には直接効きにくい。

## 適用候補

### 候補1: webview buildの並列化

現在:

- `compile:webview` は `compile:webview:crop_pdf && compile:webview:merge_pdf`
- 2つのwebview appは基本的に独立している

期待:

- local / CI両方のbuild時間を少し短縮できる可能性がある

注意:

- これはGitHub Actionsのparallel stepsより、package script側で並列化した方がlocalにも効く
- 変更するなら別タスクで実測する

### 候補2: Playwright browser installのcache

現在:

- `pnpm exec playwright install` が各OSで実行されている

判断:

- parallel stepsよりcacheの方が効果が出やすい
- 先にPlaywright browser cacheを検証する方がよい

### 候補3: 外部ツールinstallの並列化

現在:

- vscode-test workflowではGhostscript / Poppler / rsvgなどの外部ツールをinstallしている

判断:

- install script内で独立処理があるなら並列化余地がある
- ただしOSごとに処理が違うため、まずscript内訳と時間を調査する必要がある

### 候補4: release workflowのpublish/upload並列化

現在:

- VSIX作成後にGitHub Release upload、VS Marketplace publish、Open VSX publishを行う

判断:

- 認証・失敗時の扱いが絡むため、CI高速化目的で優先しない

## 採用しない箇所

- `pnpm` setupと`actions/setup-node`の並列化
- `pnpm install`とtest/buildの並列化
- VS Code integration testの単純なshard化

## 次にやるなら

parallel stepsそのものより、以下を優先する。

1. Playwright browser cacheを検証する
2. 外部ツールinstall時間をOS別に分解する
3. package script側でwebview buildを並列化できるか検証する

## 参考

- `docs/research/2026-07-02-github-actions-parallel-steps.md`

## 変更可能なファイル

- `docs/tasks/0083-audit-github-actions-parallel-steps.md`
- `docs/tasks/README.md`
- `docs/research/2026-07-02-github-actions-parallel-steps.md`

## 対象外

- workflow変更
- package script変更
- cache導入

## 確認方法

- ドキュメント差分確認
