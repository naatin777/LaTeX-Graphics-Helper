# Playwright browser cache

## 調査日

2026-07-02

## 対象

- Playwright browser install
- GitHub Actions cacheへの適用可否

## 公式情報源

- https://playwright.dev/docs/ci
- https://playwright.dev/docs/browsers

## 確認できた事実

- PlaywrightのCI docsでは、CI実行時に依存関係をinstallし、Playwright browsersをinstallしてからtestを実行する例が示されている。
- Playwrightのbrowser docsでは、browser binaryの既定保存先がOS別に示されている。
  - Windows: `%USERPROFILE%\AppData\Local\ms-playwright`
  - macOS: `~/Library/Caches/ms-playwright`
  - Linux: `~/.cache/ms-playwright`
- `PLAYWRIGHT_BROWSERS_PATH` により、browser binaryの保存先を変更できる。
- Playwrightはbrowser binaryの利用状況を追跡し、不要なbrowser binaryを削除する。

## 判断

現時点では、Playwright browser cacheを導入しない。

理由:

- Playwright公式docsは、CIでは通常 `playwright install` でbrowserをinstallする構成を案内している。
- browser binaryは数百MB規模であり、cache restore/save自体が重くなる可能性がある。
- Linuxではbrowser binaryだけでなくOS package dependencyも関係するため、browser binary cacheだけでは十分でない可能性がある。
- 現在のPlaywright testは、実testより `pnpm exec playwright install` が重いが、cache導入で確実に短縮するとは限らない。

## 未確認事項

- `actions/cache` でOS別browser cacheを導入した場合の実測時間
- cache hit / miss時の差
- Playwright version更新時のcache invalidation設計
- Linux / macOS / Windowsそれぞれでcache restore/saveがdownloadより速いか

## 再確認条件

- Playwright installがCI全体の主要ボトルネックになった場合
- GitHub Actions cacheのrestore/save時間が改善された場合
- Playwright公式docsの推奨が変わった場合
