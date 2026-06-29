# タスク: PNGに変換コマンドの失敗テストを追加する

## Status

Done

## 目的

出力形式基準の `convertToPng` コマンドを実装する前に、公開コマンドとExplorer context menuの期待仕様をテストで固定する。

このタスクでは実装を変更せず、現在未実装であることを示す失敗テストだけを追加する。

## 完了条件

- `latex-graphics-helper.convertToPng` が公開コマンドとして登録されることをテストする
- `convertToPng` が共有の `変換` submenu に表示されることをテストする
- PNGへ変換できる入力形式に対して表示条件が設定されることをテストする
- PNG自身には `convertToPng` を表示しないことをテストする
- 実装変更は行わない

## 変更可能なファイル

- `test/package_manifest.test.ts`
- `docs/tasks/0054-add-convert-to-png-output-format-tests.md`
- `docs/tasks/README.md`

## 対象外

- `src/` の実装変更
- `package.json` の実装修正
- 実際のPNG変換処理
- PDFからPNGへの画像サイズ検証
- Safe Mode / Undo / progress / cancellation の追加検証

## 関連

- `docs/specs/output-format-conversion.md`
- `docs/tasks/0053-update-test-matrix-for-current-conversions.md`

## 確認方法

- `pnpm run check:test`
- `pnpm run test`
