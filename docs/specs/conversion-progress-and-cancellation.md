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
- 通常のoperation stagingは、そのoperation rootだけをcleanupする。外部toolの診断scratchは別管理とし、失敗時に残る場合がある
- 通常の失敗エラーではなく、キャンセルされたことを通知する

## 対応済み

- `latex-graphics-helper.cropPdf.auto`
- `latex-graphics-helper.splitPdf.allPages`
- `latex-graphics-helper.convertPngToPdf`

今後、Webviewを使用しない変換commandを実装する場合も同じ方式を使用する。

## Clipboard Paste

Clipboard PasteもQuickPick・InputBox後から変換、commit、Undo記録、cleanupまで同じ`AbortSignal`へ接続する。

- 変換開始前またはcommit前のcancelでは最終出力を作らない。
- conflict dialog中にcancelされた場合はcommitを開始せず、既存出力を変更しない。
- commit中にcancelされた場合は、commit済み出力と現在処理中の出力をcommit側のrollbackへ渡す。
- Sharp・pdf-libなど即時停止できない処理は完了を待つ場合があるが、cancel後に新しい最終commitを開始しない。
- stagingのmkdir/write失敗、変換失敗、commit失敗、cancelではClipboard Pasteのoperation rootだけをcleanupする。
- commit完了後にeditor側のtokenがcancelされた場合は、既に作成した出力とUndo recordを保持し、snippetは返さない。
- Undo record作成失敗はPaste全体を失敗にせず、出力とsnippetを維持する。不要stagingはcleanupし、失敗はOutput Channelへ記録する。
