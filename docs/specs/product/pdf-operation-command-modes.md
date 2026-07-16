# PDF操作コマンドのquick / configure方針

## 目的

PDFのcrop / split / mergeは、すぐ実行できる操作と、画面で条件を細かく指定する操作を分ける。`manual`という名前は使わない。

## quick系

短い選択肢または既定値だけで実行し、細かいページ単位の調整は扱わない。

| 操作      | command                                        |
| --------- | ---------------------------------------------- |
| PDF crop  | `latex-graphics-helper.cropPdf.auto`           |
| PDF split | `latex-graphics-helper.splitPdf.allPages`      |
| PDF merge | `latex-graphics-helper.mergePdf.selectedFiles` |

## configure系

PDFを画面で確認しながら、ページ選択、順序変更、範囲指定などの細かい条件を指定する。

| 操作      | command                                    |
| --------- | ------------------------------------------ |
| PDF crop  | `latex-graphics-helper.cropPdf.configure`  |
| PDF split | `latex-graphics-helper.splitPdf.configure` |
| PDF merge | `latex-graphics-helper.mergePdf.configure` |

quick系とconfigure系は、既存のSafe Mode、Undo、progress、cancellationの利用者向け挙動に従う。LaTeX挿入はPDF操作とは別系統として扱う。
