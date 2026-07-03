# PDF操作コマンドのquick / configure方針

## 目的

PDFのcrop / split / mergeは、すぐ実行できる操作と、Webview GUIで細かく指定する操作を分ける。

`manual` という名前は使わない。

理由:

- ユーザーにとって「manual」が何を意味するか分かりにくい
- Webview GUIで行う本質は「手作業」ではなく「条件を設定して実行」すること
- quick系とconfigure系に分ける方が、context menu / command ID / テストの責務を説明しやすい

## 用語

### quick系

短い選択肢または既定値だけで実行する操作。

特徴:

- Webviewを開かない
- pickerや設定値だけで実行する
- 細かいページ単位の調整は扱わない
- 既存のSafe Mode / Undo / progress / cancellation方針に従う

### configure系

Webview GUIでPDFを確認しながら条件を指定して実行する操作。

特徴:

- Webviewを開く
- PDFページ表示やサムネイルを使える
- ページ選択、順序変更、範囲指定などの細かい制御を扱う
- Webview自体には`withProgress`を使わない
- 実際の変換・出力反映処理では既存のSafe Mode / Undo / progress / cancellation方針に従う

## command ID方針

`manual` は新規command IDに使わない。

| 操作      | quick系                                        | configure系                                |
| --------- | ---------------------------------------------- | ------------------------------------------ |
| PDF crop  | `latex-graphics-helper.cropPdf.auto`           | `latex-graphics-helper.cropPdf.configure`  |
| PDF split | `latex-graphics-helper.splitPdf.allPages`      | `latex-graphics-helper.splitPdf.configure` |
| PDF merge | `latex-graphics-helper.mergePdf.selectedFiles` | `latex-graphics-helper.mergePdf.configure` |

注意:

- 現行実装に `manual` や `selectedPages` が残っている場合は、後続の実装タスクで上記方針へ合わせる
- 既存の公開済み旧command IDとの互換aliasは、`docs/specs/v1-migration-from-v051.md`の方針に従い実装しない

## crop

### `cropPdf.auto`

`cropPdf.auto` はquick系として扱う。

仕様:

- PDFを選択して実行する
- `latex-graphics-helper.cropPdf.marginOptions` に設定されたmargin候補をpickerに表示する
- ユーザーがmarginを1つ選ぶ
- 選んだmarginを全ページへ同じように適用して切り抜く
- 出力先は `latex-graphics-helper.outputPath.cropPdf` を使う

`cropPdf.auto` では、特定ページだけを切り抜く、ページごとに異なる範囲を指定する、PDFを見ながら範囲を調整する、といった操作は扱わない。

### `cropPdf.configure`

`cropPdf.configure` はconfigure系として扱う。

仕様として決めるべきこと:

- 全ページを同じ条件で切り抜く操作
- 特定ページだけを選択して切り抜く操作
- ページごとに異なるcrop範囲を持てるか
- crop範囲をmarginで表現するか、bboxで表現するか、両方扱うか
- 複数PDFを同時に扱うか

この仕様は `docs/tasks/0103-design-crop-pdf-configure-gui.md` で決める。

## split

### `splitPdf.allPages`

`splitPdf.allPages` はquick系として扱う。

仕様:

- 選択PDFの全ページをページごとのPDFへ分割する
- 出力先は `latex-graphics-helper.outputPath.splitPdf` を使う
- ページ番号には `${page}` を使う

### `splitPdf.configure`

`splitPdf.configure` はconfigure系として扱う。

仕様として決めるべきこと:

- ページを選択してページごとのPDFへ出力するか
- 選択ページを1つのPDFへまとめるか
- 範囲入力、チェックボックス、サムネイル選択のどれを使うか
- 出力単位ごとのoutputPathをどう扱うか

この仕様は `docs/tasks/0106-design-split-pdf-configure-gui.md` で決める。

## merge

### `mergePdf.selectedFiles`

`mergePdf.selectedFiles` はquick系として扱う。

仕様:

- Explorerで選択したPDFファイルを、選択順またはVS Codeから渡された順序で結合する
- 細かいページ選択や順序変更は扱わない
- 出力先はユーザーが選ぶ

現行実装に `mergePdf.selectedPages` が残っている場合、対象はページではなくファイルなので、後続タスクで `mergePdf.selectedFiles` へ寄せる。

### `mergePdf.configure`

`mergePdf.configure` はconfigure系として扱う。

仕様として決めるべきこと:

- PDFファイル単位の順序変更
- ページ単位の選択
- ページ単位の順序変更
- 単一PDFのページ再構成を扱うか
- 複数PDF必須にするか

この仕様は `docs/tasks/0109-design-merge-pdf-gui.md` で決める。

## LaTeX挿入との関係

LaTeX挿入はPDF操作のquick / configureとは別系統で扱う。

command IDや設定を追加する場合は、`insertLatex.*` などLaTeX挿入であることが分かる名前にする。

`resizebox` などのLaTeX出力形式は、PDF操作GUIとは混ぜず、LaTeX挿入設定の別タスクで扱う。
