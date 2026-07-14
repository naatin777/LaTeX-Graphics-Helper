# タスク: VS Code Electron Playwright harnessを追加する

## Status

Todo

## 目的

既存dependencyだけを使い、Playwrightから固定versionの実VS Codeを起動してCrop PDF ConfigureのWebviewへ到達し、確実に終了できる最小harnessを追加する。

## テストする仕様

- `@vscode/test-electron`でVS Code 1.128.0を取得・解決できる
- `@playwright/test`の`_electron`で実VS Code windowを取得できる
- 一時workspace、user data、extensions directoryをテストごとに分離する
- 開発中の拡張機能が読み込まれる
- ExplorerからCrop PDF Configureを開き、実Webviewへ到達できる
- 固定時間の待機を使わず、VS Code window、Explorer、Webviewの成立条件を待つ
- 成功時・失敗時のどちらでもVS Code processと一時directoryを片付ける

## 変更可能なファイル

- `docs/tasks/0153-add-vscode-electron-harness.md`
- `docs/tasks/README.md`
- `test/playwright/electron/`
- `test/playwright/fixtures/`
- `playwright.config.mjs`
- `package.json`
- `.github/workflows/test.yml`

## 対象外

- dependency追加
- `src/`とWebview実装の変更
- 既存ブラウザPlaywright testの削除・期待値変更
- PDF全ページの描画内容検証
- crop値入力、Apply、出力PDF検証
- Dark / Light切替とscreenshot baseline
- macOS / Windows CIへのElectron E2E追加
- Quick cropと外部`pdfcrop` CLIの確認

## 完了条件

- `test:playwright`が従来のブラウザtestだけを実行する
- `test:playwright:electron`でharness smoke testだけを実行できる
- ローカルでharness smoke testが成功する
- Linux CIで既存のVS Code test後にharness smoke testが成功する
- dependencyとlockfileを変更していない
- 固定sleepが存在しない
- テスト終了後にVS Code processが残らない
- 既存ブラウザPlaywright testが引き続き成功する

## 関連

- [ADR-0013: VS Code ElectronをWebview visual testに使う](../adr/0013-use-vscode-electron-for-webview-visual-tests.md)
- [0152: VS Code Electron E2EでWebview visual testを設計する](0152-design-vscode-electron-e2e.md)
- [テスト方針](../test-policy.md)

## 確認方法

- `pnpm run check:all`
- `pnpm run test:playwright`
- `pnpm run test:playwright:electron`
- `git diff --check`
