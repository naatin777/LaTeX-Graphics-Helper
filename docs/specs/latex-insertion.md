# LaTeX Drop/Paste入力仕様

## 適用範囲

この仕様は、LaTeX documentへのPDF drag and dropとClipboard Pasteが生成するsnippetの入力境界を定義する。Clipboard画像の変換・commit lifecycleは、0187のtaskと実装で定義する。

## PDF drag and drop

### URI-list

`text/uri-list`はRFC 2483形式の行単位データとして扱う。

- 空行を無視する。
- `#`で始まる行をcommentとして無視する。
- 残った行はURIとしてparseする。
- parseに失敗した行が1件でもあればprovider全体を辞退する。
- `file:` URIだけを対象とする。非file URIが1件でもあればprovider全体を辞退する。
- `.pdf`拡張子は大文字小文字を区別しない。
- 同じfile URIが複数ある場合は、最初の1件だけを残す。
- 非PDF URIが1件でもあればprovider全体を辞退する。PDFだけを黙って抽出した部分snippetは返さない。
- 対象URIが0件の場合はproviderを辞退する。

provider全体の辞退は、`undefined`を返すことを意味する。dropを別providerへ渡せるよう、エラー通知や部分的なDocumentDropEditは生成しない。

### documentとpath

- document URIはlocal `file:` URIでなければならない。未保存document、remote documentは辞退する。
- PDF URIもlocal `file:` URIでなければならない。
- PDFはworkspace内に限定しない。drop providerはPDFへ書き込まないため、document directoryからのlocal relative pathを生成する。
- workspace外のPDFでも、同一filesystem rootでrelative pathを生成できる場合は許可する。`..`を含むrelative pathも許可する。
- Windowsで異なるdrive、relative pathにできないUNC rootなど、結果がabsolute pathになる場合は辞退する。
- 生成したpathはLaTeX向けに`/`へ正規化する。

### snippet

- 単一PDFと複数PDFは同じ`figure.alignmentOptions`を使う。
- Clipboard Pasteが生成するfigureも同じalignment設定を使う。
- file nameはcaptionとlabelのplaceholderへescapeして渡す。

## Cancellation

URI-listの読み込み後、parse中、snippet作成前にCancellationTokenがcancelされた場合はsnippetを返さずproviderを辞退する。drop providerはファイルへの書き込みを行わないため、cancel時のartifact cleanupは発生しない。

## 未解決

- WindowsのUNC pathで同一rootをrelative pathへ変換できるかはWindows CIで追加確認する。
