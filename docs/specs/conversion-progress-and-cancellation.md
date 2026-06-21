# 変換処理の進捗表示とキャンセル仕様

## 原則

Webviewを使用しない変換処理は、`vscode.window.withProgress` で実行中であることを表示する。

Webviewを使用する処理は、Webview側で状態を表示できるため、この仕様の対象外とする。

## Progress

- `vscode.ProgressLocation.Notification` を使用する
- `cancellable: true` にする
- command層で `withProgress` を開始する
- 変換処理のcore層へVS Code APIを渡さない

## キャンセル

command層で `AbortController` を作成し、VS Codeの `CancellationToken` がキャンセルされたら `abort()` する。

変換処理のcore層は `AbortSignal` を受け取る。

キャンセル時は以下の動作とする。

- 実行中の外部コマンドを終了する
- `p-limit` で待機中の変換を開始しない
- `pdf-lib` など即時停止できない同期処理は、処理前後のチェックポイントで停止する
- 指定出力先へは結果を反映しない
- `.latex-graphics-helper/` 内の途中ファイルは削除しない
- 通常の失敗エラーではなく、キャンセルされたことを通知する

## 対応済み

- `latex-graphics-helper.cropPdf.auto`
- `latex-graphics-helper.splitPdf.allPages`

今後、Webviewを使用しない変換commandを実装する場合も同じ方式を使用する。
