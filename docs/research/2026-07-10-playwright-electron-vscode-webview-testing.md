# Playwright ElectronとVS Code Webviewテスト

## 調査日

2026-07-10

## 対象

- Playwright 1.61.0
- `@vscode/test-cli` 0.0.12
- `@vscode/test-electron` 3.0.0
- VS Code 1.105以降

## 公式情報源

- https://playwright.dev/docs/api/class-electron
- https://playwright.dev/docs/test-snapshots
- https://code.visualstudio.com/api/working-with-extensions/testing-extension

## 確認できた事実

- PlaywrightはElectron applicationを起動し、window取得、DOM操作、screenshot取得を行える。
- PlaywrightのElectron対応は公式documentationでexperimentalと明記されている。
- PlaywrightはElectron main processから直接開くnative dialogを通常のpage操作ではinterceptしない。必要ならmain process側でdialog APIを置き換える必要がある。
- VS Code公式は、Extension Development Host内でVS Code APIを使うintegration testに`@vscode/test-cli`と`@vscode/test-electron`を案内している。
- Playwrightの`toHaveScreenshot`はpixel comparisonを行えるが、browser renderingはOS、browser version、hardware、headless設定などで変わり得る。基準画像は同じ環境で生成する必要がある。

## 判断

現時点では、既存のPlaywright testとvscode-testを1つのrunnerへ全面統一しない。

- PlaywrightはWebview単体のDOM、PDF.js canvas、入力、message、screenshotを担当する。
- vscode-testはextension command、VS Code API、settings、workspace、globalState、Host側file operationを担当する。
- 両者の重複を減らす場合はrunnerではなくfixtureと検証helperを共有する。
- 実VS CodeをPlaywright Electronで操作するfull E2Eは、`cropPdf.configure`を1本通す小さなspikeを別タスクで評価してから採否を決める。

## プロジェクトへの影響

- 実際の`pdfcrop`結果は、まずHost側operationまたはcommand integration testで検証する。
- WebviewのApply payloadはPlaywrightで検証し、同じfixtureとcrop boxをHost側テストでも使う。
- Webview操作から実出力までを1本で保証する必要がある場合だけ、Playwright Electron spikeを追加する。
- screenshotはUI regressionに使い、PDF・画像変換の内容正しさはrasterized output comparisonで検証する。

## 未確認事項

- VS Code配布版をPlaywright Electronから安定して起動し、Webview iframeへアクセスできるか
- macOS、Windows、Linuxで同じ起動方法を使えるか
- VS Codeのversion更新に対してselectorを安定維持できるか
- native notification、Quick Pick、file pickerをどの範囲まで自動操作またはstubできるか
- full E2EをCIへ追加した場合の実行時間とflakiness

## 再確認条件

- Playwright Electron spikeへ着手するとき
- PlaywrightがElectron対応をstableに変更したとき
- VS Code公式がWebviewを含むUI automationの推奨手段を公開したとき
- PlaywrightまたはVS Codeのmajor updateを行うとき

## 関連

- `docs/specs/internal/test-policy.md`
- `docs/tasks/0126-design-real-fixture-and-visual-testing.md`
