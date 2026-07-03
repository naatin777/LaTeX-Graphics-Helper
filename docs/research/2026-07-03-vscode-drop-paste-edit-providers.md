# VS Codeのdrop/paste edit provider調査

## 調査日

2026-07-03

## 対象version

- VS Code API: `@types/vscode` 1.105.0

## 公式情報源

- VS Code API Reference: https://code.visualstudio.com/api/references/vscode-api
- VS Code API型定義: `node_modules/@types/vscode/index.d.ts`

## 確認できた事実

- editorへのdrag & dropは `DocumentDropEditProvider` で扱う。
- editorへのpasteは `DocumentPasteEditProvider` で扱う。
- `registerDocumentDropEditProvider` には `DocumentDropEditProviderMetadata` を渡せる。
- `DocumentDropEditProviderMetadata.dropMimeTypes` には `text/uri-list` を指定できる。これはExplorerやtree viewからdropされたresource向け。
- `registerDocumentPasteEditProvider` には `DocumentPasteProviderMetadata` が必須。
- `DocumentPasteProviderMetadata.pasteMimeTypes` には `image/png` や `image/jpeg` のようなMIME typeを指定できる。
- OS標準ファイルピッカーではなくVS Code内の入力UIで保存先を編集したい場合は、`showInputBox` を使うのが適している。

## 採用判断

- PDFファイルのdrag & dropは `DocumentDropEditProvider` と `text/uri-list` で扱う。
- クリップボード画像pasteは `DocumentPasteEditProvider` と `image/png` / `image/jpeg` で扱う。
- clipboard画像の保存先は `latex-graphics-helper.outputPath.clipboardImage` を展開した値を `showInputBox` の初期値として表示し、その場で編集できるようにする。
- 入力された保存先はworkspace内に制限する。

## 未確認事項

- VS Codeの将来versionでdrop/paste providerのmetadata仕様が変更されるか。
- WSL / Remote SSH上で `showInputBox` の操作感がローカルと完全に同じか。

## 再確認条件

- VS Code engine versionを上げる場合
- paste対象MIME typeを追加する場合
- OS標準ファイルピッカーによる保存先選択を導入する場合
