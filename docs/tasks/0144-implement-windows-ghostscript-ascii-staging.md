# タスク: Windows Ghostscript用ASCII stagingを実装する

## Status

Todo

## 目的

タスク0143の失敗テストを通す最小実装として、Windows Ghostscriptへ安全なASCII入出力pathだけを渡す。

## 完了条件

- タスク0143のテストが成功する
- Unicodeを含む元pathとoutputPathを維持する
- exit code、期待出力の存在、非0 byteを成功条件にする
- Safe Mode、Undo、cancel、作業領域の既存仕様を維持する

## 変更可能なファイル

- タスク0142・0143で特定したGhostscript関連実装
- `docs/tasks/README.md`
- `docs/tasks/0144-implement-windows-ghostscript-ascii-staging.md`

## 対象外

- pdftocairoとrsvg-convertの変更
- crop仕様の変更

## 関連

- [Ghostscript staging失敗テスト](0143-add-windows-ghostscript-ascii-staging-tests.md)

## 確認方法

- `CI=true pnpm run check:all`
- `CI=true pnpm run test:vscode`
- Windows GitHub Actions
