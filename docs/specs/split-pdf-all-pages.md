# PDF全ページ分割仕様

## 対象

- command: `latex-graphics-helper.splitPdf.allPages`
- 入力: Explorerから選択された1件以上のローカルPDF
- PDF処理: `pdf-lib`

## 入力

commandは `uri` と `uris` を受け取る。

`uris` に1件以上ある場合は複数選択されたPDFを対象とし、ない場合は `uri` を対象とする。

入力PDFは開いているworkspaceに属している必要がある。

## 作業領域

元PDFを以下へコピーし、コピーに対して処理する。

```text
<workspace>/.latex-graphics-helper/split-pdf/<一意ID>/<入力ごとのディレクトリ>/
```

元PDFのコピーと、1ページごとの完成PDFを成功後も残す。

## 分割処理

- `pdf-lib` で元PDFを読み込む
- 各ページを1ページだけ含む新しいPDFとして保存する
- ページ番号は1始まりとする
- `${page}` はゼロ埋めしない10進数文字列とする
- 新しい外部ツールやdependencyは追加しない

## 出力

設定名は `latex-graphics-helper.outputPath.splitPdf` とする。

既定値:

```text
${fileDirname}/${fileBasenameNoExtension}/${page}.pdf
```

出力パスは元PDFのパス情報とページ番号で展開する。

相対パスは入力PDFが属するworkspaceを基準に解決する。

すべての入力PDF・全ページの分割が成功するまで、指定出力先へファイルを作成しない。

出力先が同じ変換内で重複する場合は、出力反映前に全体停止する。

出力先に既存ファイルがある場合は、`docs/specs/safe-mode.md`に従って処理する。

出力反映途中で失敗した場合は、その実行で反映済みの出力だけを削除する。

## 進捗表示とキャンセル

通知領域の `vscode.window.withProgress` 内で実行し、キャンセル可能にする。

キャンセル時は以下の動作とする。

- 未開始のPDF分割を開始しない
- ページ処理の前後でキャンセルを確認する
- 指定出力先へ結果を反映しない
- `.latex-graphics-helper/` 内の途中ファイルは残す
- エラーではなくキャンセル通知を表示する

Webviewは使用しない。

## 直前の変換の取消

分割成功後の通知に「Undo」を表示する。

生成したすべてのページPDFを、直前の変換1回分として記録する。

取消時の安全条件は `docs/specs/undo-last-conversion.md` に従う。

## エラー

以下の場合は全体を停止する。

- 入力がない
- PDF以外が含まれる
- 入力がworkspaceに属していない
- PDFが0ページ
- PDFを読み込みまたは保存できない
- 出力先が重複する
- 出力先が既に存在する
- workspace境界検証に失敗する
- 完成ファイルを出力先へ反映できない

## 今後の拡張

- ページを選択するmanual split
