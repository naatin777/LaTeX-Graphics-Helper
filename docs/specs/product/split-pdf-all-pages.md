# PDF全ページ分割仕様

## 対象

- command: `latex-graphics-helper.splitPdf.allPages`
- 入力: Explorerから選択された1件以上のローカルPDF

## 出力

- 入力PDFをページごとのPDFへ分割する。
- ページ番号は1始まりの10進数とする。
- 出力先は`latex-graphics-helper.outputPath.splitPdf`を元PDFのパス情報とページ番号で展開する。
- 相対パスは入力PDFが属するworkspaceを基準に解決する。
- すべての入力とページの処理が成功するまで指定出力先へ反映しない。
- 同じ変換内で出力先が重複する場合は全体停止する。
- 既存出力との競合時は[Safe Mode仕様](safe-mode.md)に従う。

既定の出力pathは`${fileDirname}/${fileBasenameNoExtension}/${page}.pdf`とする。

## キャンセルと取り消し

キャンセル時は未開始の処理を開始せず、指定出力先へ結果を反映しない。成功後は[Undo仕様](undo-last-conversion.md)の対象にする。

## エラー

入力なし、PDF以外、workspace外、0ページPDF、重複または既存の出力先、読み書き失敗、出力反映失敗は全体を停止する。キャンセルは通常のエラーとして扱わない。
