# タスク: ページ単位変換の出力パスにpage変数を必須化する失敗テストを追加する

## Status

Done

## 目的

PDFやDraw.ioのように、1入力から複数ページ分の出力を作り得る変換では、出力パス設定に `${page}` が含まれない場合に変換を開始しないことをテストで固定する。

複数ページ変換で出力パスが衝突し、意図しない上書きや全体停止になることを防ぐ。

## 完了条件

- PDFからPNGへの変換で、出力パス設定に `${page}` がない場合にエラーになることをテストする
- エラー時に出力ファイルが作成されないことをテストする
- Draw.ioから画像/PDF/SVGへの変換にも同じ仕様を適用するためのテスト方針を明記する
- ページ単位変換の既定出力パスが `${page}` を含むことをテストする
- 実装変更は行わない

## 変更可能なファイル

- `test/convert_to_png_command.test.ts`
- 必要なら `test/` 配下のDraw.io変換テスト
- `docs/tasks/0057-add-page-variable-required-tests.md`
- `docs/tasks/README.md`

## 対象外

- `src/` の実装変更
- `package.json` の変更
- 実際のpage変数必須チェック実装
- 出力パス設定の既定値変更

## Draw.ioのテスト方針

現時点ではDraw.io変換のcommand handlerが `src/` に存在しないため、このタスクでは既定出力パスに `${page}` が含まれることをmanifest testで固定する。

Draw.io変換commandを実装するタスクでは、PDFからPNGへの変換と同様に、出力パス設定から `${page}` を外した場合に変換開始前エラーになることをcommand testで追加する。

## 関連

- `docs/specs/output-format-conversion.md`
- `docs/tasks/0056-add-convert-to-png-pdf-tests.md`

## 確認方法

- `pnpm run check:test`
- `pnpm run test`
