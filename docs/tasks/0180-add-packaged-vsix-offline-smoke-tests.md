# タスク: パッケージ済みVSIXのオフライン3 OS smoke testを追加する

## Status

Todo

## 目的

release用に生成したVSIXをLinux、macOS、WindowsのVS Codeへinstallし、networkなしでもextension activation、PDF.js Webview preview、外部CLIなしで完結する主要機能が動くことを確認する。

## 完了条件

- 3 OSで対象platformのVSIXをinstallしている
- network accessを禁止した状態でextensionがactivateする
- Crop PDF ConfigureでPDFの全ページがcanvasへ描画される
- `pdf-lib`だけで完結するcrop / merge経路を実行できる
- 外部CLIがない場合に、CLI依存機能が誤って成功扱いにならないことを確認する
- test失敗時にVS Code、Webview、network errorの証拠をartifactへ残す
- uninstall後に一時workspaceとVS Code user-dataが残らない

## 変更可能なファイル

- `.github/workflows/`
- `test/`
- `scripts/`
- `docs/tasks/0180-add-packaged-vsix-offline-smoke-tests.md`
- `docs/tasks/README.md`
- 必要な`docs/research/`

## 対象外

- VSIXのproduction dependency同梱方式の変更
- release tagの作成・公開
- 変換処理やPDF.js描画の実装変更
- 外部CLIのinstall方式変更

## 関連

- [0162: パッケージ済みVSIXのオフライン・3 OS動作を調査する](0162-audit-offline-vsix-cross-platform.md)
- [0179: VSIXのproduction dependency同梱とplatform packageを成立させる](0179-fix-vsix-production-dependency-packaging.md)

## 確認方法

- GitHub Actionsの3 OS matrix
- network遮断を明示したVS Code起動
- VSIX install / uninstall後のfile system確認
- `pnpm run check`
- `git diff --check`
