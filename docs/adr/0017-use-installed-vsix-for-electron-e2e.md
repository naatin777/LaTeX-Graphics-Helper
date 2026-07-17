# ADR-0017: 配布済みVSIXをElectron E2Eとreleaseの検証単位にする

## ステータス

採用

## 日付

2026-07-17

> 補足（2026-07-17）: Node / Extension Hostのtest allocationは[ADR-0018](0018-use-extension-host-for-pre-package-tests.md)に置き換えられた。配布済みVSIXのE2Eとrelease artifactに関する判断は引き続き有効である。

## 背景

Browser Playwrightとsource directoryを読むExtension Development Hostは、Webviewや拡張機能の一部を速く確認できる。しかし、どちらも実際に公開するVSIXがruntime file、Webview asset、native dependencyを含み、VS Code上で動くことの証明にはならない。

特にnative dependencyを含むVSIXはrunnerごとに生成する必要がある。package前のsourceを対象にしたE2Eや、検証後にpublish jobで作り直したVSIXでは、検証した配布物と公開した配布物が異なり得る。

静的検査、Node / Extension Hostの契約確認、配布物E2E、tag releaseを1つのworkflowに集約すると、trigger、失敗の意味、公開前に必要な証拠が不明確になる。

## 決定

releaseの配布物に関わるE2Eは、同じrunnerで直前にpackageし、隔離したextensions directoryへinstallしたVSIXだけを対象にする。VSIX pathを必須とし、source directoryをExtension Development Hostとして読み込む経路は使わない。Browser Playwrightは使用しない。

CIは証拠の責務に応じて、静的検査の`check.yml`、Node / Extension Host testの`test.yml`、通常変更時のpackage済みVSIX Electron E2Eの`playwright.yml`、tag releaseの`release.yml`に分ける。tag releaseでは各OSでE2Eを通したVSIX artifactをpublish jobへ渡し、publish jobでbuildやpackageをやり直さない。

Node testはprotocol、validation、状態変換などの純粋な契約を、Extension Host testはVS Code APIの契約を担う。package済みVSIX Electron E2Eは、実VS Code上のWebview、Host message bridge、activation、runtime dependencyを必要とする重要な利用経路だけを担う。

## 理由

- package・install・起動を連続させることで、公開する配布物そのものを検証できる
- OSごとのnative dependencyを、その配布物を作ったrunner上で確認できる
- publish artifactを再生成しないため、検証対象と公開対象を一致させられる
- test runtimeを必要なoracleで分けることで、全機能を遅いE2Eへ重複させずに済む
- workflowのtriggerと責務を分けることで、通常変更の回帰確認とtag公開の失敗原因を追跡しやすい

## 代替案

### Browser Playwrightとsource directoryのElectronを併用する

実行は比較的速いが、配布済みVSIXの内容やnative dependencyの可用性を証明できない。Webview protocolなどBrowserを必要としない契約はNode testで確認できるため、採用しない。

### publish jobでVSIXを再build・再packageする

公開jobを単独で完結できるが、検証済みartifactと公開artifactが異なり得るため採用しない。

### 静的検査、runtime test、package E2E、releaseを単一workflowにする

設定量は減るが、eventごとの責務と失敗の意味が混ざり、release前の証拠を確認しにくいため採用しない。

## 結果・影響

- package済みVSIX Electron E2EはLinux、macOS、Windowsで実行するため、CI時間とrunner利用量が増える
- Browser DOMだけのlayout、zoom、mocked Host操作は独立した回帰対象にしない
- failure artifactとして、Playwright report、trace、screenshot、test result、VS Code / Extension Host logを残す必要がある
- 配布物以外の契約はNodeまたはExtension Host testで維持し、E2Eへ同じ検証を重複させない
- workflowの具体的なjob、command、artifact名はworkflow fileとtest policyを正本とする

## 見直す条件

- VS CodeまたはPlaywrightが、installed VSIXを対象にするより適切な公式E2E手段を提供した場合
- native dependencyを含まないuniversal VSIXへ移行し、OS別package・検証の前提が変わった場合
- MarketplaceまたはOpen VSXの公開仕様により、検証済みartifactをそのままpublishできなくなった場合
- package済みVSIX E2Eが3 OSで継続的に運用不能になり、同等以上の配布物証拠を得る別手段が確認できた場合

## 関連

- [ADR-0013: VS Code ElectronをWebview visual testに使う](0013-use-vscode-electron-for-webview-visual-tests.md)（置き換え済み）
- [ADR-0015: runtime stagingからOS別VSIXを生成する](0015-build-platform-specific-vsix-from-runtime-staging.md)
- [ADR-0018: pre-package testはVS Code Extension Hostで実行する](0018-use-extension-host-for-pre-package-tests.md)（test allocation）
- [test policy](../specs/internal/test-policy.md)
- [VSIX packaging仕様](../specs/internal/packaging.md)
- [0197: CI・Playwright・VSIX releaseを4 workflowへ整理する](../tasks/0197-verify-cross-platform-vsix-release.md)
