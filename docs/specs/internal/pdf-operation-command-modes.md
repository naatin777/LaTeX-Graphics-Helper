# PDF操作command modeの内部境界

PDF操作の利用者向けquick/configure挙動は、[product specification](../product/pdf-operation-command-modes.md)を正本とする。この文書は、command routing、Webview boundary、共通operation coreの責務だけを記録する。

## Routing boundary

command registryではquick系とconfigure系を別の入口として扱う。`manual`を新しい内部aliasやcommand名として追加せず、旧command IDの移行はproduct側のmigration specificationへ委譲する。

## Quick boundary

quick系のcommand adapterはWebview sessionを作らず、pickerまたは設定値を入力として共通operation coreを呼び出す。

## Configure boundary

configure系のcommand adapterはWebview sessionと`crop-pdf-configure` protocolを所有する。Webviewのrender lifecycleと、`apply`後の変換・出力operationを分離し、Webview表示中のprogressを変換coreのprogressと混同しない。

## Shared operation boundary

quick/configureの出力operationは、共通のSafe Mode、Undo、progress、cancellation contractへ接続する。format-specificなPDF処理やcommit処理をcommand registryへ実装しない。
