# タスク: 変換の進捗表示とキャンセルを実装する

## Status

Done

## 目的

`cropPdf.auto` の実行中に進捗通知を表示し、ユーザーが安全にキャンセルできるようにする。

## 完了条件

- `vscode.window.withProgress` を通知領域へ表示する
- progressをキャンセル可能にする
- CancellationTokenをAbortSignalへ変換する
- 実行中のGhostscriptをキャンセルする
- 未開始の複数変換を開始しない
- キャンセル後に指定出力先へ反映しない
- `.latex-graphics-helper/` 内の途中ファイルを残す
- Webview処理にはwithProgressを追加しない

## 変更可能なファイル

- `src/commands/crop_pdf_auto.ts`
- `src/operations/crop_pdf_auto.ts`
- `docs/specs/internal/auto-crop.md`
- `docs/specs/internal/conversion-progress-and-cancellation.md`
- `docs/test-matrix.md`
- `docs/tasks/README.md`
- `docs/tasks/0017-implement-conversion-progress-and-cancellation.md`

## 対象外

- Webview内の進捗UI
- 作業途中ファイルの削除
- crop以外の未実装command

## 関連

- `docs/specs/internal/auto-crop.md`
- `docs/specs/internal/conversion-progress-and-cancellation.md`
- `docs/tasks/0016-add-conversion-cancellation-tests.md`

## 確認方法

- `pnpm run check:all`
- `pnpm run test`

## 実施結果

- `cropPdf.auto` の変換部分を通知領域の `vscode.window.withProgress` で実行するようにした
- progressを `cancellable: true` にした
- VS CodeのCancellationTokenをAbortControllerへ接続した
- AbortSignalを変換処理とGhostscriptの `execFile` へ渡した
- 変換開始前、各主要処理の前後、各ページ処理、出力反映の前後でキャンセルを確認する
- `p-limit` で待機中の変換は、キャンセル後にGhostscriptを開始しない
- 出力反映中にキャンセルされた場合は、その実行で作成済みの出力をロールバックする
- `.latex-graphics-helper/` 内の途中ファイルは残す
- キャンセル時はエラーではなくキャンセル通知を表示する
- Webview処理は変更していない
- `pnpm run check:all` 成功（既存を含むlint warningあり）
- `pnpm run test` 成功（29 tests）
