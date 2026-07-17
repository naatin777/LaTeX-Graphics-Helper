# ADR-0013: VS Code ElectronをWebview visual testに使う

## ステータス

置き換え済み（[ADR-0017](0017-use-installed-vsix-for-electron-e2e.md)）

## 日付

2026-07-14

## 背景

WebviewのCSSは、実行時にVS Codeが提供する`--vscode-*` CSS変数と、`vscode-dark`や`vscode-light`などの`body` classに依存する。ブラウザ単体のPlaywrightでは、DOM操作やcanvas描画を確認できても、実VS CodeのthemeとCSS環境を正しく検証できない。

一方、`@playwright/test`のElectron対応はexperimentalであり、既存のブラウザPlaywrightと`vscode-test`を直ちに統合すると、起動、selector、実行時間、CI安定性のriskが広がる。既存dependencyには`@playwright/test`の`_electron`と`@vscode/test-electron`があり、追加dependencyなしで実VS Codeを対象にできる。

## 決定

- Webviewの実操作とvisual testの正本を、実VS Code上のPlaywright Electronへ段階的に移行する
- 既存dependencyの`@playwright/test`の`_electron`と`@vscode/test-electron`を使い、追加dependencyは導入しない
- Electron側で同等のcoverageが安定するまで、既存のブラウザPlaywrightを維持する
- UI screenshotによるvisual regressionと、出力fileの内容検証を別の責務として扱う

具体的な実行環境、fixture、theme、screenshot、待機条件、移行順は`docs/specs/internal/test-policy.md`と関連taskを正本とする。

## 理由

- 実VS CodeのCSS変数とtheme classを含む環境をvisual testの対象にできる
- Webview操作からHost側の処理と出力確認までの接続を検証できる
- 既存dependencyを使うため、dependency追加と管理costを増やさずに済む
- experimentalなrunnerを段階的に導入することで、起動・終了・flakinessの問題を小さい範囲で把握できる

## 代替案

### ブラウザ単体のPlaywrightをvisual testの正本にする

実行が速く既存testを使いやすいが、実VS CodeのCSS変数とtheme classを再現できず、実際のWebviewと異なる状態を基準にするおそれがあるため採用しない。

### 直ちに全testをPlaywright Electronへ置き換える

runnerを早く統一できるが、experimentalなrunnerの不安定さを全testへ広げ、問題発生時の原因範囲を大きくするため採用しない。

### 複数OSで安定した場合だけ採用する

OS差を先に確認できるが、狭い環境での実現性確認まで遅らせるため採用しない。まず限定した環境で安定性を確認し、必要に応じて対象を広げる。

## 結果・影響

- Webviewのvisual testは実VS Codeのtheme環境を基準にできる
- 移行期間はブラウザPlaywrightとPlaywright Electronが並存し、実行時間と保守対象が一時的に増える
- 段階導入中は、環境をまたいだvisual regressionの保証範囲が限定される
- Electron側の同等coverageが安定した機能から、ブラウザ側の重複testを削減できる
- UI screenshotだけでは出力fileの内容が正しいことを保証できないため、内容検証を別に維持する必要がある

## 見直す条件

- Playwright Electronのexperimental statusが変わったとき
- ElectronのharnessまたはE2E testを安定して実行できないとき
- Electron側の同等coverageが安定し、ブラウザ側の役割を終えられるとき
- visual regressionの対象環境を広げる必要が生じたとき
- VS CodeまたはPlaywright公式の推奨するWebview UI automation手段が変わったとき

## 関連

- [ADRの運用方針](README.md)
- [VS Code Webviewのcrop仕様](../specs/internal/crop-pdf-configure.md)
- [Playwright Electronのテスト方針](../specs/internal/test-policy.md#playwright-electron)
- [Playwright ElectronとVS Code Webviewテストの調査](../research/2026-07-10-playwright-electron-vscode-webview-testing.md)
- [0126: 実fixtureと画像比較を使うテスト方針を決める](../tasks/0126-design-real-fixture-and-visual-testing.md)
- [0152: VS Code Electron E2EでWebview visual testを設計する](../tasks/0152-design-vscode-electron-e2e.md)
- [0153: VS Code Electron Playwright harnessを追加する](../tasks/0153-add-vscode-electron-harness.md)
- [0154: Crop PDF ConfigureのElectron E2Eとtheme snapshotを追加する](../tasks/0154-add-crop-pdf-configure-electron-e2e.md)
- [0168: ADR-0013からElectron testの実行詳細を分離する](../tasks/0168-separate-electron-test-details-from-adr-0013.md)
