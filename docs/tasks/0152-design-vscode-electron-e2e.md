# タスク: VS Code Electron E2EでWebview visual testを設計する

## Status

Done

## 目的

VS Code Webviewが実際のVS Codeから提供されるCSS変数とtheme classに依存することを踏まえ、Webviewの実操作とvisual testの正本を実VS Code上のPlaywright Electronへ段階移行する方針を決める。

## 決めること

- Webviewのvisual testの正本は、実VS Code上で動くPlaywright Electronとする。ブラウザ単体のPlaywrightは、`--vscode-*` CSS変数や`vscode-dark` / `vscode-light`などの`body` classを再現しないため、visual testの正本にしない。
- 既存dependencyの`@playwright/test`が提供する`_electron`と`@vscode/test-electron`を使う。追加dependencyは導入しない。
- 実VS Code上のWebview操作から出力確認までを、安定した機能単位から段階的にElectron側へ移行する。
- 既存ブラウザPlaywrightは直ちに削除しない。同等coverageがElectron側で安定してから機能単位で削除し、最終的にbrowser runner、Chromium install、関連workflowを廃止する。
- 最初の実行対象はLinux CI、VS Code 1.128.0固定とする。LightはDefault Light Modern、DarkはDefault Dark Modernを使う。
- golden比較はLinuxの実Webview領域だけを対象とする。失敗時は診断用にVS Code window全体のscreenshotをartifactへ残す。High ContrastとmacOS / Windowsのgoldenは対象外とする。
- 固定sleepは使わない。DOM状態、theme class、computed style、file変更検知など、成立条件を待つ。

後続の実装タスクは次の2段階に分ける。

- 0153: 起動、拡張読込、Crop Configureを開くこと、Webview到達、確実な終了だけを確認するharness smoke test
- 0154: 固定fixture `q a.pdf`を一時workspaceへコピーし、全ページcanvas、実VS Code CSS変数、Dark / Light、crop値入力、Apply、出力PDFのpage count / MediaBox / CropBoxを検証するE2E test

`Crop PDF Configure`のApply処理は`pdf-lib`であり、外部`pdfcrop` CLIではない。実`pdfcrop` CLIの確認はQuick cropの別タスクで扱う。UI screenshotは出力PDF内容検証の代用にしない。

## 完了条件

- Webview CSSの依存関係を理由に、ブラウザ単体をvisual testの正本にしない方針を記録している
- 既存dependencyだけを使うElectron移行方針を記録している
- Linux CI、VS Code 1.128.0、Light / Dark theme、golden範囲、失敗時artifact、待機条件を記録している
- 0153のharness smoke testと0154のCrop Configure E2E testの責務を分けている
- ConfigureのApplyが`pdf-lib`であることと、Quick cropの`pdfcrop` CLI確認を分離している
- コード、test、fixture、`package.json`、workflow、dependencyを変更していない
- `docs/tasks/README.md`のCurrent Taskを「なし」のままにし、0152をCompleted Tasksへ追加している

## 変更可能なファイル

- `docs/tasks/0152-design-vscode-electron-e2e.md`
- `docs/tasks/README.md`
- `docs/adr/0013-use-vscode-electron-for-webview-visual-tests.md`
- `docs/specs/internal/test-policy.md`

## 対象外

- 0153 / 0154のコード、test、fixtureの作成
- `src/`、`test/`、`test/fixtures/`の変更
- `package.json`、lockfile、workflow、dependencyの変更
- Playwright Electronの実装・CI導入
- 既存ブラウザPlaywrightの削除
- macOS / Windows / High Contrastのgolden追加
- Quick cropで使う外部`pdfcrop` CLIの確認
- UI screenshotによる出力PDF内容の検証
- 既存の2026-07-10 research noteの変更

## 関連

- [PDF configure crop仕様](../specs/internal/crop-pdf-configure.md)
- [テスト方針](../specs/internal/test-policy.md)
- [Playwright ElectronとVS Code Webviewテストの調査](../research/2026-07-10-playwright-electron-vscode-webview-testing.md)
- [0123: cropPdf.configureの操作テストを追加する](0123-add-crop-pdf-configure-operation-tests.md)
- [0126: 実fixtureと画像比較を使うテスト方針を決める](0126-design-real-fixture-and-visual-testing.md)
- [ADR-0013: VS Code ElectronをWebview visual testに使う](../adr/0013-use-vscode-electron-for-webview-visual-tests.md)

## 確認方法

- `docs/tasks/README.md`のCurrent Taskが「なし」で、0152がCompleted Tasksにあることを確認する
- タスク文書とADRに、決定済みの実行環境、theme、golden、待機、後続タスク、対象外を確認する
- `docs/specs/internal/test-policy.md`でWebview、vscode-test、ブラウザPlaywright、Playwright Electronの役割分担を確認する
- 2026-07-10のresearch noteが変更されていないことを確認する
- `git diff --check`

## 確認結果

- `git diff --check` 成功
- 変更は指定された4ファイルだけで、コード、test、fixture、`package.json`、workflow、dependencyは変更していない
- Current Taskは「なし」のまま、0152をCompleted Tasksへ追加した
- 2026-07-10のresearch noteは変更していない
