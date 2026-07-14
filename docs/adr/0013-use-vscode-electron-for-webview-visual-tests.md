# ADR-0013: VS Code ElectronをWebview visual testに使う

## ステータス

採用

## 日付

2026-07-14

## 背景

WebviewのCSSは、実行時にVS Codeが提供する`--vscode-*` CSS変数と、`vscode-dark` / `vscode-light`などの`body` classに依存する。ブラウザ単体のPlaywrightでWebviewを検証すると、DOM操作やcanvas描画は確認できても、実VS CodeのthemeとCSS環境を正しく検証できない。

一方、Playwright ElectronはElectron対応がexperimentalであり、既存のブラウザPlaywrightと`vscode-test`をすぐに1つへ統合するには起動、selector、実行時間、CI安定性のリスクがある。既存dependencyには`@playwright/test`の`_electron`と`@vscode/test-electron`があり、追加dependencyなしで実VS Codeを対象にした段階導入を検討できる。

## 決定

- Webviewの実操作とvisual testの正本を、実VS Code上のPlaywright Electronへ段階的に移行する。
- 既存dependencyの`@playwright/test`の`_electron`と`@vscode/test-electron`を使い、追加dependencyは導入しない。
- 初期対象はLinux CIに限定し、VS Codeは1.128.0へ固定する。LightはDefault Light Modern、DarkはDefault Dark Modernとする。
- golden比較はLinuxの実Webview領域だけに限定する。失敗時はVS Code window全体のscreenshotをartifactとして残す。High ContrastとmacOS / Windowsのgoldenは作らない。
- 待機はDOM状態、theme class、computed style、file変更検知などの成立条件で行い、固定sleepを使わない。
- 0153で起動・拡張読込・Crop Configureを開く・Webview到達・確実な終了を確認するharness smoke testを作り、0154で固定fixture `q a.pdf`を使うCrop Configure E2Eを作る。
- 既存ブラウザPlaywrightは、同等coverageがElectron側で安定するまで維持する。安定後に機能単位で削除し、最終的にbrowser runner、Chromium install、関連workflowを廃止する。
- ConfigureのApplyは`pdf-lib`の処理として検証する。外部`pdfcrop` CLIはQuick cropの別タスクで扱い、UI screenshotを出力PDF内容の検証に使わない。

## 理由

- 実VS CodeのCSS変数とtheme classを含む環境を、visual testの対象そのものにできる。
- Webview操作、Apply、出力ファイル確認を一続きにすることで、ブラウザ側の見かけとHost側の実処理の接続を確認できる。
- 既存dependencyを使うため、テスト方針の変更に伴うdependency追加と管理コストを増やさない。
- experimentalなrunnerをLinuxの固定環境と小さなharnessから導入することで、起動・終了・flakinessの問題を段階的に把握できる。

## 代替案

### 案A: ブラウザ単体のPlaywrightをvisual testの正本にする

メリット:

- 実行が速く、既存のテスト資産をそのまま使いやすい
- browser runnerとChromiumの環境を管理しやすい

デメリット:

- 実VS Codeの`--vscode-*` CSS変数とtheme classを正しく検証できない
- 実際のWebview表示と異なる状態をgoldenとして固定するおそれがある

### 案B: 直ちに全テストをPlaywright Electronへ置き換える

メリット:

- runnerの重複を早く減らせる
- 実VS Code上の操作へ統一できる

デメリット:

- experimentalなrunnerの不安定さを全テストへ一度に広げる
- 起動、終了、selector、実行時間の問題が起きたときに原因範囲が大きくなる

### 案C: 3 OSで安定した場合だけ採用する

メリット:

- macOS、Windows、Linuxの差を先に確認できる

デメリット:

- Linuxでの実現性確認まで含めて導入判断が遅くなる
- Linuxで十分に安定化できる可能性を、3 OSの準備によって失う

この案の「3 OSで安定した場合のみ採用する」という条件は撤回し、Linuxで安定化してから対象OS拡大の必要性を判断する。

## 結果・影響

- Webviewのvisual testは実VS Codeのtheme環境を正本にできる。
- 初期CIはLinuxと固定VS Code versionに限定されるため、goldenの範囲とOS横断の見た目保証は狭い。
- 移行期間はブラウザPlaywrightとPlaywright Electronが並存し、テスト実行時間と保守対象が一時的に増える。
- Electron側の同等coverageが安定した機能から、ブラウザ側の重複テストと最終的なbrowser runner環境を縮小できる。
- 0154では、画面の見た目だけでなく、出力PDFのpage count、MediaBox、CropBoxを確認する。ConfigureのApplyが`pdf-lib`であることを前提にし、`pdfcrop` CLIの結果とは混同しない。

## 運用ルール

- まず0153のharness smoke testで起動から終了までを安定させ、その後0154のCrop Configure E2Eへ進む。
- goldenはLinuxの実Webview領域だけを更新対象とし、VS Code window全体のscreenshotは失敗時の診断artifactとして扱う。
- 固定sleepでflakinessを隠さず、DOM、theme class、computed style、file変更などの成立条件を待つ。
- browser Playwrightを削除するときは、対象機能のElectron側同等coverageと安定性を確認してから機能単位で行う。

## 見直し条件

- Playwright Electronがexperimentalではなくなったとき
- VS Code 1.128.0から更新する必要が生じたとき
- LinuxでharnessまたはCrop Configure E2Eが安定しないとき
- Electron側の同等coverageが安定し、ブラウザ側の重複を削除できるとき
- macOS / WindowsまたはHigh Contrastのgoldenが必要になったとき
- VS Code公式またはPlaywright公式の推奨するWebview UI automation手段が変わったとき

## 関連

- [VS Code Webviewのcrop仕様](../specs/crop-pdf-configure.md)
- [テスト方針](../test-policy.md)
- [Playwright ElectronとVS Code Webviewテストの調査](../research/2026-07-10-playwright-electron-vscode-webview-testing.md)
- [0126: 実fixtureと画像比較を使うテスト方針を決める](../tasks/0126-design-real-fixture-and-visual-testing.md)
- [0152: VS Code Electron E2EでWebview visual testを設計する](../tasks/0152-design-vscode-electron-e2e.md)
