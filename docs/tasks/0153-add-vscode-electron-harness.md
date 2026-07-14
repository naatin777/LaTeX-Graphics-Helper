# タスク: VS Code Electron Playwright harnessを追加する

## Status

Done

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

## 実施結果

- 既存の`@playwright/test`と`@vscode/test-electron`だけでVS Code 1.128.0を起動する`vscode-electron` projectを追加した
- 従来のブラウザtestは`webview-browser` projectへ分け、`test:playwright`の対象を変更していない
- 固定fixtureの`q a.pdf`を一時workspaceへコピーし、実Explorerの右クリックmenuからCrop PDF Configureを開くsmoke testを追加した
- 関係のないWebview frameを成功扱いせず、Crop PDF Configure固有の`Custom Crop`見出しがあるframeへ到達したことを確認する
- macOSでVS CodeのIPC socket path上限を超えないよう、Unix系の一時rootを短い`/tmp`配下にした
- `user-data`、`shared-data`、`extensions`をテストごとに分離し、個人のVS Code storageへ書き込まないようにした
- macOSのnative menuをPlaywrightから操作できるよう、隔離したテスト用設定だけ`window.menuStyle: custom`にした
- UI操作に固定sleepを使わず、menu itemの表示・focusと対象Webviewの成立条件を待つようにした
- 成功時・失敗時ともElectron applicationを閉じ、残存processを停止して一時rootを削除する後始末を追加した
- Linuxの既存VS Code test後に`test:playwright:electron`を実行するCI stepを追加した

ローカルでは以下を確認した。

- `pnpm run check:all`
- `pnpm run test:vscode`: 169件成功
- `pnpm run test:playwright`: 18件成功
- `pnpm run test:playwright:electron`: 1件成功
- `pnpm exec playwright test --project=vscode-electron --repeat-each=3`: 3回連続成功
