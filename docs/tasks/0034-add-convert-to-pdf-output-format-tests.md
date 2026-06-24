# タスク: PDFに変換コマンドの失敗テストを追加する

## Status

Done

## 目的

出力形式基準の`PDFに変換`コマンドを実装する前に、外から見た期待挙動をテストで固定する。

## Test target

- `latex-graphics-helper.convertToPdf` commandが登録されること
- PNGを`PDFに変換`できること
- 複数PNGを1回のコマンドでPDFへ変換できること
- 異なる画像形式を同時に選択した場合の検証方針を固定すること
- 非対応入力が含まれる場合、変換全体を開始しないこと
- 入力形式と出力形式が同じ場合、変換全体を開始しないこと
- 出力PDFが1ページであること
- PDFページサイズが入力画像のpixel幅・高さと同じ数値のpointになること
- Safe Modeの競合判断がバッチ全体で1回だけ行われること
- キャンセル時に指定出力先へ何も反映しないこと

## Mocked

- 必要に応じて`vscode.window.withProgress`
- 必要に応じてSafe Modeの競合判断
- 必要に応じて設定値

実ファイル変換を確認するテストでは、実PNG fixtureと実ファイル出力を使用する。

## Not tested

- 実装されていない画像形式変換の詳細
- Draw.ioからPDFへの変換詳細
- PDF結合
- context menuの画面上の表示
- 旧command ID aliasの完全な互換性

## 完了条件

- 期待する`PDFに変換`のcommand behaviorテストが追加されている
- PDFページサイズを検証するテストがある
- 失敗・キャンセル・Safe Modeの単位を検証するテストがある
- test file冒頭にTest target、Mocked、Not testedが記載されている
- `src/`を変更せずにテストを追加する

## 変更可能なファイル

- `test/`配下の新規または関連test file
- `docs/test-matrix.md`
- `docs/tasks/README.md`
- `docs/tasks/0034-add-convert-to-pdf-output-format-tests.md`

## 対象外

- `src/`の変更
- `package.json`の変更
- 変換実装
- dependency追加
- 仕様変更

## 関連

- `docs/specs/output-format-conversion.md`
- `docs/specs/safe-mode.md`
- `docs/specs/conversion-progress-and-cancellation.md`
- `docs/tasks/0035-implement-convert-to-pdf-output-format-command.md`

## 確認方法

- `pnpm run check:test`
- `pnpm run test`
