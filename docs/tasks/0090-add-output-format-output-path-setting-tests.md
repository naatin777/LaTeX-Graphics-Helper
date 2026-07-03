# タスク: 出力形式基準outputPath設定のテストを追加する

## Status

Done

## 目的

`outputPath.convertTo*` 設定を実装する前に、新設定と既存ペア別設定の優先順位をテストで固定する。

## 完了条件

- `outputPath.convertToPdf` が設定されている場合、PDF出力コマンドでペア別設定より優先されることをテストする
- `outputPath.convertToPng` が設定されている場合、PNG出力コマンドでペア別設定より優先されることをテストする
- `outputPath.convertToSvg` が設定されている場合、PDF入力などページ出力を含む変換で `${page}` を扱えることをテストする
- 新設定が空文字、トリムして空文字、または未設定の場合、既存ペア別設定へfallbackすることをテストする

## 変更可能なファイル

- `test/`

## 対象外

- `src/` の実装変更
- `package.json` の設定追加
- 既存テスト期待値の都合のよい変更

## 関連

- `docs/specs/output-format-conversion.md`
- `docs/tasks/0089-design-output-format-output-path-settings.md`

## 確認方法

- `CI=true pnpm run test -- --grep "outputPath"`

## 実装内容

- `outputPath.convertToPdf` が `outputPath.convertPngToPdf` より優先されるテストを追加した
- `outputPath.convertToPdf` が空文字、空白のみ、未設定の場合に `outputPath.convertPngToPdf` へfallbackするテストを追加した
- `outputPath.convertToPng` が `outputPath.convertPdfToPng` より優先され、`${page}` を展開するテストを追加した
- `outputPath.convertToSvg` が `outputPath.convertPdfToSvg` より優先され、`${page}` を展開するテストを追加した
- 実装変更は行っていないため、優先テストは0091実装まで失敗する想定
