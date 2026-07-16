# 変換処理の進捗表示とキャンセルの内部契約

`conversion-progress-and-cancellation`の利用者向け挙動は、[product specification](../product/conversion-progress-and-cancellation.md)を正本とする。この文書は、command、core、外部処理、stagingの境界だけを記録する。

## Progress boundary

- Webviewを使用しない変換では、command層が`vscode.window.withProgress`を開始する。
- progress locationは`vscode.ProgressLocation.Notification`、`cancellable`は`true`とする。
- 変換coreへVS Code APIを渡さず、coreはruntime-neutralな入力を受け取る。

## Cancellation propagation

command層で`AbortController`を作成し、VS Codeの`CancellationToken`から`AbortSignal`へ接続する。

- 外部commandの終了を要求する。
- `p-limit`で待機中の処理を開始しない。
- `pdf-lib`など即時停止できない処理は、処理前後のcheckpointでsignalを確認する。
- operation stagingのcleanupは、そのoperation rootの所有者が行う。
- 外部toolの診断scratchは通常のoperation stagingと分離して管理する。

## Clipboard Paste transaction

Clipboard PasteはQuickPick・InputBox後から変換、commit、Undo記録、cleanupまで同じ`AbortSignal`へ接続する。

- commit前のsignalはcommit coordinatorへ渡し、commitを開始しない。
- commit中のsignalはcommit側のrollbackへ渡す。
- Sharp・pdf-libなど即時停止できない処理は完了を待つ場合があるが、signal確認後に新しいfinal commitを開始しない。
- stagingのmkdir/write、変換、commit、cancelに伴うcleanupはClipboard Pasteのoperation rootに限定する。
- commit後にUndo recordを作成できない場合のrecord失敗処理と不要stagingのcleanupは、Pasteのtransaction ownerが行う。
