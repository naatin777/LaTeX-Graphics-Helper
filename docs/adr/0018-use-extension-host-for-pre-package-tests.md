# ADR-0018: pre-package testはVS Code Extension Hostで実行する

## ステータス

採用

## 日付

2026-07-17

## 背景

選定した純粋ロジックのtestをplain Node + Mochaで、残りをVS Code Extension Hostで実行すると、同じ`test/` directoryの実行経路、script、CI jobが分かれる。Node対象をExtension Hostから除外する必要もあり、通常のtest入口だけでは全testの実行範囲を把握しにくい。

これらのtestはExtension Hostで実行しても成立しており、maintainerはNode起動の速度差より、1つの明確な実行経路を優先する判断をした。

## 決定

pre-package testはすべてVS Code Extension Hostで実行する。`npm test`はbuild後に`vscode-test`を呼び、`out/test/**/*.test.js`を除外せずに1回実行する。plain Node + Mochaを直接起動するtest scriptは持たない。

`test.yml`はLinux、macOS、Windowsの各runnerで同じ`npm test`を実行する。package済みVSIXのE2Eは引き続き別のElectron Playwright workflowで扱う。

## 理由

- 開発者とCIが使うruntime testの入口を1つにできる
- test fileの所有runnerと除外listを維持しなくてよい
- pure logicとVS Code API利用のtestを同じtest discoveryとreportingで確認できる
- 配布物を確認するElectron E2Eとは、対象と目的を分けたままにできる

## 代替案

### 選定したpure logic testだけをplain Node + Mochaで実行する

VS Codeの起動を避けられるが、test script、CI job、Extension Hostの除外listを分ける必要があり、通常のtest入口を複雑にするため採用しない。

### すべてのtestをplain Nodeで実行する

VS Code API、workspace、configuration、notificationなどのoracleを失うため採用しない。

## 結果・影響

- pure logic testを含むすべてのpre-package testでVS Code起動のcostを受け入れる
- `npm test`だけで全test scopeを実行できる
- Extension Host testの3 OS実行を維持する
- Browser Playwrightは復活させず、配布済みVSIX E2Eの責務とも混ぜない

## 見直す条件

- Extension Hostで実行できないtest contractが生じ、別runtimeが必要になった場合
- Extension Hostの起動・test discoveryが継続的に運用不能になった場合
- 実行時間の実測により、同じcoverageを保ったまま分離する明確な利益が確認できた場合

## 関連

- [ADR-0017: 配布済みVSIXをElectron E2Eとreleaseの検証単位にする](0017-use-installed-vsix-for-electron-e2e.md)
- [test policy](../specs/internal/test-policy.md)
- [0197: CI・Playwright・VSIX releaseを4 workflowへ整理する](../tasks/0197-verify-cross-platform-vsix-release.md)
- [0201: Node-level testの実行基盤を決定する](../tasks/0201-decide-node-test-runtime.md)（置き換え済み）
