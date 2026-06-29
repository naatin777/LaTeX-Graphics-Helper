# タスク: PNGに変換コマンドをメニューへ追加する

## Status

Done

## 目的

0054で追加した失敗テストを通すため、出力形式基準の `convertToPng` を公開コマンドとExplorer context menuへ追加する。

このタスクでは、実際のPNG変換処理は実装しない。

## 完了条件

- `latex-graphics-helper.convertToPng` を `package.json` の公開コマンドへ追加する
- `convertToPng` を共有の `変換` submenu へ追加する
- PNGへ変換できる非PNG入力に対して表示条件を設定する
- 日本語・英語の表示ラベルを追加する
- 0054で追加した失敗テストが通る

## 変更可能なファイル

- `package.json`
- `package.nls.json`
- `package.nls.ja.json`
- `docs/tasks/0055-implement-convert-to-png-output-format-menu.md`
- `docs/tasks/README.md`

## 対象外

- `src/` の実装変更
- `convertToPng` のcommand handler登録
- PDFからPNGへの実変換処理
- Safe Mode / Undo / progress / cancellation の追加実装
- 他の出力形式コマンドの追加

## 関連

- `docs/tasks/0054-add-convert-to-png-output-format-tests.md`
- `docs/specs/output-format-conversion.md`

## 確認方法

- `pnpm run check:test`
- `pnpm run test`
