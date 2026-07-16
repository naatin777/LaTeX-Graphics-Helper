# PDF自動クロップ仕様

## 対象

- command: `latex-graphics-helper.cropPdf.auto`
- 入力: Explorerから選択された1件以上のローカルPDF

## 操作

処理開始前にmargin pickerを1回だけ表示し、選択されたmarginをすべての入力PDFへ適用する。単位はPDFポイントとする。

選択肢は`latex-graphics-helper.cropPdf.marginOptions`で設定し、既定値は次のとおりとする。

```json
[0, 5, 10, 20]
```

## 出力

- 入力PDFごとに1つのクロップ済みPDFを作成する。
- 出力先は`latex-graphics-helper.outputPath.cropPdf`を元PDFのパス情報で展開する。
- 相対パスは入力PDFが属するworkspaceを基準に解決する。
- すべての入力が成功するまで、指定出力先へ反映しない。
- 出力先の競合時は[Safe Mode仕様](safe-mode.md)に従う。

空白ページは元のページサイズを維持する。ページの分割や再結合は行わない。

## キャンセルと取り消し

キャンセルされた場合は指定出力先へ結果を反映せず、キャンセルとして通知する。変換成功後は、直前の変換として[Undo仕様](undo-last-conversion.md)の対象にする。

## エラー

入力不備、workspace外の入力、無効なmargin、重複または既存の出力先、変換失敗、PDFの読み書き失敗、出力反映失敗は全体を停止する。

キャンセルは通常のエラーとして扱わない。
