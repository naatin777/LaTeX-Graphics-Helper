# タスク: 変換キャンセルの失敗テストを追加する

## Status

Done

## 目的

`cropPdf.auto` の変換キャンセル時に、外部コマンドと出力反映が安全に停止する仕様を実装前に固定する。

## 完了条件

- 開始前にキャンセル済みならGhostscriptを実行しないテストがある
- 実行中のGhostscriptへAbortSignalが伝わるテストがある
- キャンセル後に待機中の複数変換を開始しないテストがある
- キャンセル時に指定出力先へファイルを作らないテストがある
- 未実装を理由としてテストが失敗することを確認する

## 変更可能なファイル

- `test/crop_pdf_auto.test.ts`
- `docs/specs/internal/conversion-progress-and-cancellation.md`
- `docs/test-matrix.md`
- `docs/tasks/README.md`
- `docs/tasks/0016-add-conversion-cancellation-tests.md`
- `docs/tasks/0017-implement-conversion-progress-and-cancellation.md`

## 対象外

- キャンセル処理の実装
- withProgressの実装
- Webviewを使用する処理

## 関連

- `docs/specs/internal/auto-crop.md`
- `docs/specs/internal/conversion-progress-and-cancellation.md`

## 確認方法

- `pnpm run check:test`
- 未実装のAbortSignal対応により失敗することを確認する

## 実施結果

- 開始前キャンセル、実行中Ghostscriptへのsignal伝播、待機中変換の停止をテストに追加した
- キャンセル時に指定出力先へファイルを作成しないことを確認対象にした
- `pnpm run check:test` は `CropPdfOptions.signal` とGhostscriptへのsignal伝播が未実装のため、想定どおり失敗した
