---
name: lgh-vscode-testing
description: LaTeX Graphics HelperのVS Code API、Extension Host、Webview、SolidJS UI、VS Code Electron、Playwrightに関係する変更のテスト方法を選択する。コマンド登録、Webview操作、VS Code上でのファイル操作を変更したときに使用する。
---

# LHG VS Codeテスト

変更された動作を確認できる最も低いテスト境界を選択する。

## テスト境界

### Unit Test

純粋関数、パーサー、パス判定、変換オプションの組み立てに使用する。

### Integration Test

VS Code API、コマンド実行、ファイル操作、外部CLIとの接続に使用する。

### VS Code Electron / Playwright

実際のExtension Host、Webview表示、ユーザー操作、画面遷移が必要な場合に使用する。

## 手順

1. ユーザーから観測できる期待動作を明確にする。
2. 既存テストから最も近いテスト境界を探す。
3. 実装詳細ではなく動作を検証する。
4. 実フィクスチャがある場合は再利用する。
5. 修正前に失敗を再現できることを確認する。
6. 修正後に同じテストを成功させる。

## 規則

- VS Code APIを過剰にモックしない。
- Webviewの内部実装だけを検証して完了扱いしない。
- 不安定な待ち時間の固定値を増やさない。
- PlaywrightをUnit Testで確認できる変更に乱用しない。
- スクリーンショットだけで動作確認を代用しない。
