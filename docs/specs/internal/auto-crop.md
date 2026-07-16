# PDF自動クロップ仕様

## 対象

- command: `latex-graphics-helper.cropPdf.auto`
- 入力: Explorerから選択された1件以上のローカルPDF
- 外部ツール: Ghostscript

## 入力

commandは `uri` と `uris` を受け取る。

`uris` に1件以上ある場合は複数選択されたPDFを対象とし、ない場合は `uri` を対象とする。

入力PDFは開いているworkspaceに属している必要がある。

## Margin

処理開始前にmargin pickerを1回だけ表示し、選択された値をすべての入力PDFへ適用する。

単位はPDFポイントとする。

選択肢は `latex-graphics-helper.cropPdf.marginOptions` で設定し、既定値は以下とする。

```json
[0, 5, 10, 20]
```

## 作業領域

元PDFを以下へコピーし、コピーに対して処理する。

```text
<workspace>/.latex-graphics-helper/crop-pdf/<一意ID>/<入力ごとのディレクトリ>/
```

以下を作業領域に残す。

- 元PDFのコピー
- クロップ後の完成PDF

成功後も作業領域を削除しない。

## クロップ処理

Ghostscriptはbbox deviceによる各ページの `HiResBoundingBox` 取得にだけ使用する。

Ghostscriptへ渡すPDFパスは `execFile` の独立した引数とし、PostScriptコードへ埋め込まない。

Ghostscriptの `-c`、`--permit-file-read`、pdfwrite deviceは使用しない。

空白ページは `MediaBox` を使用し、元のページサイズを維持する。

作業コピーを `pdf-lib` で読み込む。

BoundingBoxの上下左右へ選択されたmarginを追加し、各ページのMediaBoxとCropBoxを変更する。

ページの分割や再結合は行わず、変更したPDFを `pdf-lib` で完成PDFとして保存する。

複数PDFは `p-limit` で同時実行数を制限して処理する。

## 進捗表示とキャンセル

margin選択後の変換処理は、通知領域の `vscode.window.withProgress` 内で実行する。

progressはキャンセル可能とする。

キャンセルされた場合は以下の動作とする。

- 実行中のGhostscriptを終了する
- `p-limit` で待機中のPDF変換を開始しない
- `pdf-lib` の処理前後でキャンセルを確認する
- 指定出力先へ変換結果を反映しない
- `.latex-graphics-helper/` 内の途中ファイルは残す
- エラーではなくキャンセル通知を表示する

詳細は `docs/specs/internal/conversion-progress-and-cancellation.md` を参照する。

## 出力

出力先は `latex-graphics-helper.outputPath.cropPdf` を元PDFのパス情報で展開する。

相対パスになった場合は、入力PDFが属するworkspaceを基準に解決する。

テンプレート変数は元のテンプレートに対して正規表現1回で展開する。

ファイル名などの置換値に `${fileExtname}` のような文字列が含まれていても、追加のテンプレート変数として再解釈しない。

未対応のテンプレート変数が含まれる場合はエラーにする。

すべての入力PDFについて変換処理が成功するまで、指定出力先へファイルを作成しない。

出力先にファイルが既に存在する場合は、`docs/specs/internal/safe-mode.md`に従って処理する。

完成ファイルの反映途中で失敗した場合は、その実行で既に反映した出力ファイルを削除する。

## 直前の変換の取消

変換成功後の通知に「取り消す」を表示する。

取消対象は直前に成功した変換1回分の出力だけとする。

生成時と取消時のSHA-256が一致し、すべての出力が対象workspace内に存在する場合だけ削除する。

1件でも変更、欠損、workspace境界違反がある場合は、どの出力も削除しない。

通常の `Ctrl+Z` / `Cmd+Z` は変更しない。

詳細は `docs/specs/internal/undo-last-conversion.md` を参照する。

## エラー

以下の場合は全体を停止する。

- 入力がない
- PDF以外が含まれる
- 入力がworkspaceに属していない
- margin設定に有効な値がなく、既定値でも選択されなかった
- 出力先が重複する
- 出力先が既に存在する
- Ghostscriptが失敗する
- BoundingBoxを全ページ分取得できない
- PDFを `pdf-lib` で読み込みまたは保存できない
- 完成ファイルを出力先へ反映できない

キャンセルは通常のエラーとして扱わない。

## 今後の拡張

なし。
