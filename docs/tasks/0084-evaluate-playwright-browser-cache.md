# タスク: Playwright browser cacheを導入すべきか評価する

## Status

Done

## 目的

GitHub ActionsのPlaywright workflowで `pnpm exec playwright install` に時間がかかっているため、browser cacheを導入すべきか判断する。

## 結論

現時点では導入しない。

## 理由

Playwright browser binaryはOS別cache directoryに保存されるため、`actions/cache` でcacheすること自体は可能である。

ただし、現時点では以下の理由で採用しない。

- browser binaryは数百MB規模であり、cache restore/saveがdownloadより速いとは限らない
- Linuxではbrowser binary以外にOS dependencyも関係する
- Playwright version更新時のcache invalidation設計が必要になる
- CI高速化のためにcacheを増やすと、cache miss / stale cache / save時間の調査コストが増える
- まずは外部ツールinstall時間の内訳を分解した方が、リスクの低い改善候補を選びやすい

## 参考

- [Playwright browser cache調査](../research/2026-07-02-playwright-browser-cache.md)

## 次にやるなら

Playwright browser cacheを直接入れる前に、以下を優先する。

1. 外部ツールinstall時間をOS別に分解する
2. webview buildの並列化をpackage script側で検証する
3. それでもPlaywright installが主要ボトルネックなら、OS別にcache hit / missを測る専用PRで検証する

## 変更可能なファイル

- `docs/tasks/0084-evaluate-playwright-browser-cache.md`
- `docs/tasks/README.md`
- `docs/research/2026-07-02-playwright-browser-cache.md`

## 対象外

- workflow変更
- `actions/cache` 導入
- Playwright設定変更
- dependency更新

## 確認方法

- ドキュメント差分確認
