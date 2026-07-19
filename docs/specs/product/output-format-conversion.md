# 出力形式基準の変換コマンド仕様

## 目的

変換commandは入力形式と出力形式の組み合わせではなく、出力形式を基準に公開する。同じ出力形式へ変換できる複数の入力形式を、1回の操作で選択できる。

## 公開command

| Command ID                            | 表示名 | 出力形式 |
| ------------------------------------- | ------ | -------- |
| `latex-graphics-helper.convertToPdf`  | PDF    | PDF      |
| `latex-graphics-helper.convertToPng`  | PNG    | PNG      |
| `latex-graphics-helper.convertToJpeg` | JPEG   | JPEG     |
| `latex-graphics-helper.convertToWebp` | WebP   | WebP     |
| `latex-graphics-helper.convertToAvif` | AVIF   | AVIF     |
| `latex-graphics-helper.convertToSvg`  | SVG    | SVG      |

Command PaletteとExplorerの`変換`サブメニューでは、出力形式基準commandを表示する。

## 入力と処理単位

対応形式は、Draw.io、PNG、JPEG、WebP、AVIF、SVG、PDF、Mermaidの組み合わせを現行設定どおりに維持する。対応していない入力、出力と同じ形式の入力、混在選択に含まれる非対応入力がある場合は、変換全体を開始しない。

1回のcommand実行を1つの変換batchとして扱う。

- 入力ごとに出力を作成する。
- すべて成功するまで指定出力先へ反映しない。
- 1件でも失敗した場合は指定出力先へ反映しない。
- Safe Modeの判断はbatch全体で1回だけ行う。
- Undoはbatch全体を直前の1回分として扱う。
- キャンセル時は指定出力先へ反映しない。

複数画像をPDFへ変換する場合も、画像ごとに別のPDFを作成する。画像を1つのPDFへ結合する機能は別commandとして扱う。

## PDFと画像の出力

PDFを画像またはSVGへ変換する場合はページごとに出力を作成し、複数ページでは`${page}`を利用できる。出力先が同じbatch内で重複する場合は反映前に全体停止する。

画像からPDFへ変換する場合は1ページPDFとし、画像のpixel幅・高さをpoint単位のページサイズとして扱う。PDFから画像へ変換する場合はDPIに基づいてpixel数を決める。画像から画像への変換では原則としてpixel幅・高さを維持する。

Draw.ioから画像へ変換する場合は、数式を保持するためPDFを経由する。中間結果は利用者向けの出力名へ現れない。

## 設定と入力名

出力形式基準のoutputPath設定を明示した場合はそれを使い、空、空白のみ、または未設定の場合は既存の形式別設定へfallbackする。既存設定はこの仕様で削除しない。legacy設定の廃止時期は、利用実態を確認したうえで次のmajor version前に決める。

テンプレート変数は利用者が選択した論理入力を基準に展開する。editable Draw.io画像はDraw.io入力として扱い、`.drawio`などの接尾辞を除いた論理入力名を使用する。

## Mermaid

Mermaid（`.mmd`、`.mermaid`）は出力形式基準commandの入力として扱う。PDF、SVG、PNGなどの出力形式への対応と出力pathは、対応する形式の設定に従う。テーマ、背景色、fontなどの設定は初期範囲に含めない。

Mermaid CLIのbrowser channelとexecutable pathは、出力形式に依存しない`mermaid.puppeteer.*`設定を優先する。旧`convertToPdf.mermaid.puppeteer.*`および`convertToSvg.mermaid.puppeteer.*`は、共通設定が未指定の場合だけfallbackとして使用する。

## 移行

v1では入力形式・出力形式ペア別の旧command IDを公開UIへ残さない。旧command IDからの移行は[v1 migration note](v1-migration-from-v051.md)に従う。
