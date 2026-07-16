# PDF configure crop仕様

## 目的

`latex-graphics-helper.cropPdf.configure`は、PDFを画面で確認しながらcrop範囲と対象ページを指定してPDFを出力する。

初期範囲は単一PDF、1つのcrop範囲、全ページまたは選択ページへの適用、1つの出力PDFとする。複数PDF、ページごとに異なるcrop範囲、crop後のページ削除や並べ替えは扱わない。

## 入力とページ選択

- 対象PDFは1件だけとする。
- PDF以外、入力なし、workspace外、local file以外はエラーにする。
- 全ページまたは選択ページへcropを適用できる。
- ページ番号は1始まりとする。
- 選択ページ方式では1ページ以上を選択する。
- 選択されていないページの内容とページサイズは変更しない。

## crop範囲

crop範囲はPDFポイントのbboxで指定する。

- `left < right`
- `bottom < top`
- 対象ページの範囲内であること
- 小数を許可する

初期実装ではmargin指定を扱わない。margin選択は`cropPdf.auto`の役割とする。

## 出力とキャンセル

- 出力先は`latex-graphics-helper.outputPath.cropPdf`を元PDFのパス情報で展開する。
- 相対パスは入力PDFが属するworkspaceを基準に解決する。
- 出力PDFのページ数は元PDFと同じにする。
- 出力先の競合時は[Safe Mode仕様](safe-mode.md)に従う。
- キャンセル時は指定出力先へ反映しない。
- 成功後は[Undo仕様](undo-last-conversion.md)の対象にする。

## エラー

複数入力、無効なbbox、未選択のselected target、存在しないページ、PDFの読み込み・保存・出力反映の失敗はエラーにする。キャンセルは通常のエラーとして扱わない。

`cropPdf.auto`はmarginによる軽量な一括処理、`cropPdf.configure`は範囲確認とページ選択を担当する。
