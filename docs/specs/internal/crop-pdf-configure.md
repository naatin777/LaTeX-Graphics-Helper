# PDF configure crop仕様

## 対象

- command: `latex-graphics-helper.cropPdf.configure`
- 入力: Explorerから選択された単一のローカルPDF
- UI: Webview

`manual` という名前は使わない。

## 目的

PDFをWebview上で確認し、ユーザーがcrop範囲と対象ページを指定してPDFを出力できるようにする。

`cropPdf.auto` はquick系として、settings.jsonで設定したmargin候補を選ぶだけで全ページを切り抜く。

`cropPdf.configure` はconfigure系として、PDFを見ながらcrop範囲と対象ページを指定する。

## 初期実装の範囲

初期実装では以下だけを扱う。

- 単一PDF
- 1つのcrop範囲
- 全ページへ同じcrop範囲を適用する
- または、選択ページだけへ同じcrop範囲を適用する
- 出力は1つのPDF

初期実装では以下を扱わない。

- 複数PDFの同時configure crop
- ページごとに異なるcrop範囲
- 複数のcrop範囲プリセット
- crop範囲の自動検出
- crop後のページ削除やページ並び替え

理由:

- Webview GUIの最小動作を先に安定させる
- ページごとに異なるcrop範囲を持つと、UI状態・message protocol・テストが一気に重くなる
- 複数PDFはSafe Mode / Undo / cancellationの単位が大きくなるため、初期実装では避ける

## 対象入力

commandは `uri` と `uris` を受け取る。

初期実装では、対象PDFが1件だけである必要がある。

- `uris` が1件ならそのPDFを使う
- `uris` が複数件ならエラーにする
- `uris` が空で `uri` があるなら `uri` を使う
- 入力がない場合はエラーにする
- PDF以外はエラーにする
- 入力PDFは開いているworkspaceに属している必要がある
- ローカルfile URIだけを扱う

## ページ選択

Webviewでは以下を選択できる。

- `all`: 全ページにcrop範囲を適用する
- `selected`: 選択したページだけにcrop範囲を適用する

ページ番号は1始まりで扱う。

`selected` の場合、1ページ以上選択されている必要がある。

選択されていないページは、元PDFのページ内容・MediaBox・CropBoxを維持する。

## crop範囲

crop範囲はbboxで表現する。

単位はPDFポイント。

```ts
type CropBox = {
  left: number;
  bottom: number;
  right: number;
  top: number;
};
```

条件:

- `left < right`
- `bottom < top`
- bboxは対象ページのMediaBox内に収まる必要がある
- 小数は許可する
- 保存時はPDFの座標系に合わせて扱う

`cropPdf.configure` の初期実装では、margin指定は扱わない。

理由:

- quick系の `cropPdf.auto` がmargin選択を担当する
- configure系では、ユーザーが見た範囲をそのままbboxとして扱う方が明確
- bboxとmarginを同時に初期実装へ入れると、どちらが正本か曖昧になる

## Webview表示

WebviewはPDF.jsでPDFを表示する。

PDF documentのmetadataを先に読み込み、最初のページを先に表示する。残りのページはplaceholderを作成し、表示範囲付近だけを`IntersectionObserver`でrenderする。Applyは全ページのcanvas render完了を待たず、metadataと入力値の検証が完了した時点でHostへapply messageを送る。

Hostは入力PDFの `vscode.Uri` を `webview.asWebviewUri(inputUri)` で変換し、その文字列を `pdfSrc` として渡す。

Webviewは `pdfSrc` をPDF.jsへ渡してPDFを取得する。

初期実装では、少なくとも以下を表示する。

- 現在表示中のPDFページ
- ページ番号
- ページ選択UI
- crop範囲
- Apply / Cancel

ページ番号、heading、button、aria-label、入力補助文言はHostがVS Code localeに合わせてinit messageで渡す。英語・日本語以外は英語fallbackとする。

`CropPdfLabels`のfieldとmessage shapeはHostとWebviewが共有するpure protocol moduleを正本とする。

ページサムネイルは初期実装に含めてもよいが、必須にはしない。

## HostからWebviewへのmessage

```ts
type CropConfigureHostToWebview =
  | {
      type: "init";
      payload: {
        pdfSrc: string;
        fileName: string;
        pageCount: number;
        initialPage: number;
        labels: CropPdfLabels;
      };
    }
  | {
      type: "error";
      payload: {
        message: string;
      };
    };
```

`init.payload.pdfSrc` は `webview.asWebviewUri(inputUri).toString()` の結果とする。

`initialPage` は1始まりとする。

## WebviewからHostへのmessage

```ts
type CropConfigureWebviewToHost =
  | {
      type: "ready";
    }
  | {
      type: "apply";
      payload: {
        cropBox: CropBox;
        target:
          | { type: "all" }
          | {
              type: "selected";
              pages: number[];
            };
      };
    }
  | {
      type: "cancel";
    }
  | {
      type: "previewLoadFailed";
      payload: {
        message: string;
      };
    };
```

Hostは `apply` を受け取った時点で以下を検証する。

- cropBoxが数値として有効
- cropBoxが対象ページのMediaBox内に収まる
- targetが有効
- selected pagesが存在するページ番号だけを含む

Webview側でも入力補助として検証してよいが、正本の検証はHost側で行う。

## 出力

出力先は `latex-graphics-helper.outputPath.cropPdf` を元PDFのパス情報で展開する。

相対パスになった場合は、入力PDFが属するworkspaceを基準に解決する。

出力は1つのPDFとする。

全ページcropでも、選択ページcropでも、ページ数は元PDFと同じにする。

選択ページcropの場合、選択されていないページは変更しない。

## 作業領域

`cropPdf.auto` と同じく、workspace内の `.latex-graphics-helper/` 配下に作業ファイルを作る。

例:

```text
<workspace>/.latex-graphics-helper/crop-pdf-configure/<一意ID>/
```

以下を作業領域に残す。

- 元PDFのコピー
- crop後の完成PDF

成功後も作業領域は削除しない。

## Safe Mode / Undo / progress / cancellation

Webviewを開いてPDFを確認している間は `vscode.window.withProgress` を使わない。

`apply` 後の出力処理では、既存の変換処理と同じ方針に従う。

- `vscode.window.withProgress` を使う
- `cancellable: true` にする
- キャンセルされた場合は指定出力先へ反映しない
- `.latex-graphics-helper/` 内の作業ファイルは残す
- 出力先に既存ファイルがある場合はSafe Modeに従う
- 成功後は直前変換のUndo対象にする
- Webview panelのdispose時はIntersectionObserver、PDF.js render task、page/document resourceを可能な範囲でcleanupする

## エラー

以下の場合はエラーにする。

- 入力がない
- 入力が複数ある
- PDF以外が指定された
- 入力がworkspaceに属していない
- WebviewでPDFを読み込めない
- cropBoxが不正
- selected targetなのにページが選択されていない
- 存在しないページ番号が指定された
- 出力先がworkspace外
- 出力先が重複する
- PDFを読み込みまたは保存できない
- 完成ファイルを出力先へ反映できない

キャンセルは通常のエラーとして扱わない。

## `cropPdf.auto` との役割分担

| 操作                | 役割                                                         |
| ------------------- | ------------------------------------------------------------ |
| `cropPdf.auto`      | margin候補をpickerで選び、選択したmarginを全ページへ適用する |
| `cropPdf.configure` | PDFをWebviewで確認し、bboxと対象ページを指定してcropする     |

`cropPdf.auto` は軽量な一括処理を担当する。

`cropPdf.configure` は範囲確認とページ選択を担当する。

## local/refactor-ddd-architectureから参考にするもの

以下は参考にしてよい。

- bboxをPDFポイントで表現する考え方
- WebviewからHostへ `apply` messageでbboxを送る考え方
- Playwrightでcrop frameやbbox変化を検証する考え方

以下は採用しない。

- DDD風のapplication / infra / port構成の移植
- `pdfcrop` CLI前提のcrop処理
- localブランチのWebview実装のcherry-pick
- Effect / service layerの大規模な構成変更

理由:

- 現行実装は小さい変更を優先する
- crop処理は現行のGhostscript bbox取得 + pdf-lib編集方針と整合させる
- GUIだけのためにアーキテクチャを大きく変えない

## 後続タスク

- `0104: cropPdf.configure GUIの失敗テストを追加する`
- `0105: cropPdf.configure GUIを実装する`
