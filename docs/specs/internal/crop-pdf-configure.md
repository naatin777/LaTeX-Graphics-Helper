# PDF configure cropの内部境界

`cropPdf.configure`の利用者向け挙動は、[product specification](../product/crop-pdf-configure.md)を正本とする。Host/Webviewのmessage shapeは[内部protocol specification](crop-pdf-configure-protocol.md)を正本とし、この文書はprotocol以外のmodule、rendering、operation境界だけを記録する。

## Module boundary

- command adapterは`uri`と`uris`を入力境界で正規化する。
- Hostは入力URIをWebview向けURIへ変換し、Webviewへ渡す表示用データをinit messageで送る。
- Webviewは表示と入力補助を担当し、Hostが受信した`apply`の検証を正本として扱う。
- crop処理、出力反映、Safe Mode、Undo、progress、cancellationはWebviewから分離したoperation coreへ接続する。

## Rendering lifecycle

PDF metadataと最初のpageを先に読み込み、残りはplaceholderと`IntersectionObserver`で遅延renderする。Apply送信は全canvasのrender完了を前提にせず、panel dispose時はobserver、PDF.js render task、page/document resourceを可能な範囲でcleanupする。

## Operation staging

configure operationの作業fileはworkspace内の次のstaging rootで管理する。

```text
<workspace>/.latex-graphics-helper/crop-pdf-configure/<一意ID>/
```

入力コピーと完成artifactはoperation単位で管理し、final pathへのcommitはstaging処理と分離する。staging寿命とcommit失敗時のrollbackは共通のfile operation contractに従う。

## Commit integration

Webview表示中のrender lifecycleと、`apply`後の出力operationを分離する。`apply`後は共通のprogress/cancellation contractへ接続し、出力の競合解決と取消記録はそれぞれ[Safe Mode internal contract](safe-mode.md)と[Undo internal contract](undo-last-conversion.md)へ委譲する。
