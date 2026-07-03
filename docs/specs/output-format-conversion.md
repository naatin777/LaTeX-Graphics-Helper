# 出力形式基準の変換コマンド仕様

## 目的

変換コマンドを入力形式と出力形式の組み合わせではなく、出力形式基準で公開する。

例:

- `PNGをPDFに変換`、`JPEGをPDFに変換`、`SVGをPDFに変換`を`PDF`へ統合する
- `PDFをPNGに変換`、`JPEGをPNGに変換`、`SVGをPNGに変換`を`PNG`へ統合する

これにより、異なる入力形式を同時に選択して、同じ出力形式へまとめて変換できるようにする。

## 非目的

- 対応形式を増やすこと
- 既存変換実装を一度に全面刷新すること
- 画像を1つのPDFへ結合すること
- PDFページを1つの画像へ結合すること
- Webviewを使う変換UIへ変更すること

## 公開コマンド

公開する変換コマンドは以下に統合する。

| Command ID                            | 表示名 | 出力形式 |
| ------------------------------------- | ------ | -------- |
| `latex-graphics-helper.convertToPdf`  | PDF    | PDF      |
| `latex-graphics-helper.convertToPng`  | PNG    | PNG      |
| `latex-graphics-helper.convertToJpeg` | JPEG   | JPEG     |
| `latex-graphics-helper.convertToWebp` | WebP   | WebP     |
| `latex-graphics-helper.convertToAvif` | AVIF   | AVIF     |
| `latex-graphics-helper.convertToSvg`  | SVG    | SVG      |

Command PaletteとExplorer context menuでは、上記の出力形式基準コマンドを表示する。

Explorer context menuでは、入力形式ごとのサブメニューではなく、`変換`サブメニューの下に出力形式を表示する。

例:

```text
変換
├ PDF
├ PNG
├ JPEG
├ WebP
├ AVIF
└ SVG
```

Command Paletteでは、検索しやすさを優先して`PDFに変換`のような動詞付き表示名にしてもよい。

## 対応形式

現行の`package.json`で公開されている対応関係を維持する。

| 出力形式 | 対応入力形式                                 |
| -------- | -------------------------------------------- |
| PDF      | Draw.io、PNG、JPEG、WebP、AVIF、SVG、Mermaid |
| PNG      | Draw.io、PDF、JPEG、WebP、AVIF、SVG、Mermaid |
| JPEG     | Draw.io、PDF、PNG、WebP、AVIF、SVG、Mermaid  |
| WebP     | Draw.io、PDF、PNG、JPEG、AVIF、SVG、Mermaid  |
| AVIF     | Draw.io、PDF、PNG、JPEG、WebP、SVG、Mermaid  |
| SVG      | Draw.io、PDF、Mermaid                        |

現在対応していない組み合わせは、この再設計では追加しない。

Mermaid入力（`.mmd`、`.mermaid`）は`## Mermaid入力`で別途定義する。実装は段階的に追加する。

Draw.io入力には、通常の`.drawio` / `.dio`に加えて、editable Draw.io画像（`.drawio.png` / `.dio.png` / `.drawio.svg` / `.dio.svg`）を含める。

## 混在選択

同じ出力形式へ変換可能な入力形式は、同時に選択できる。

例:

- `PDFに変換`: PNG、JPEG、WebP、AVIF、SVG、Draw.ioを同時に選択できる
- `PNGに変換`: PDF、JPEG、WebP、AVIF、SVG、Draw.ioを同時に選択できる

選択された入力の中に、対象出力形式へ変換できないファイルが1件でも含まれる場合は、変換全体を開始しない。

理由:

- 一部だけ変換されると結果が分かりにくい
- Safe Mode、Undo、進捗表示の単位を単純に保てる
- 誤選択に気づきやすい

## 同じ形式への変換

入力形式と出力形式が同じファイルは、非対応入力として扱う。

例:

- PNGファイルを`PNGに変換`する
- PDFファイルを`PDFに変換`する

この場合は、変換全体を開始しない。

## 処理単位

1回のコマンド実行で選択されたファイル群を、1つの変換バッチとして扱う。

- 入力ごとに出力ファイルを作る
- すべての変換が成功するまで、指定出力先へ反映しない
- 1件でも失敗した場合、指定出力先へは何も反映しない
- `.latex-graphics-helper/`内の作業ファイルは削除しない
- Safe Modeの競合確認はバッチ全体で1回だけ行う
- Undoはバッチ全体を直前変換1回分として扱う
- キャンセルされた場合、指定出力先へは何も反映しない

複数画像を`PDFに変換`した場合も、画像ごとに別のPDFを作る。

画像を1つのPDFへ結合する機能は、必要になった場合に別コマンドとして検討する。

## PDFから画像・SVGへの変換

PDFを画像またはSVGへ変換する場合は、ページごとに別ファイルを作る。

- 1ページPDFでもページ番号変数を使える
- 複数ページPDFは、ページ数分の出力を作る
- 出力パスが同じ変換内で重複する場合は、出力反映前に全体停止する

既存の出力パス例:

```text
${fileDirname}/${fileBasenameNoExtension}-${page}.png
${fileDirname}/${fileBasenameNoExtension}-${page}.jpeg
${fileDirname}/${fileBasenameNoExtension}-${page}.svg
```

## 出力パス設定の移行方針

段階移行中は、既存の変換ペア別設定を維持する。

例:

- `latex-graphics-helper.outputPath.convertPngToPdf`
- `latex-graphics-helper.outputPath.convertJpegToPdf`
- `latex-graphics-helper.outputPath.convertPdfToPng`

出力形式基準コマンドは、内部で入力形式を判定し、対応する既存設定をfallbackとして使用する。

理由:

- 既存ユーザーの設定を壊さない
- Draw.ioのページ出力と画像の単一出力では、自然な初期値が異なる
- 1つの`outputPath.convertToPdf`だけへ急に統合すると、既存の出力規則を変えやすい

### 新しい出力形式基準設定

今後、以下の設定を追加する。

| 設定キー                                         | 対象コマンド                          |
| ------------------------------------------------ | ------------------------------------- |
| `latex-graphics-helper.outputPath.convertToPdf`  | `latex-graphics-helper.convertToPdf`  |
| `latex-graphics-helper.outputPath.convertToPng`  | `latex-graphics-helper.convertToPng`  |
| `latex-graphics-helper.outputPath.convertToJpeg` | `latex-graphics-helper.convertToJpeg` |
| `latex-graphics-helper.outputPath.convertToWebp` | `latex-graphics-helper.convertToWebp` |
| `latex-graphics-helper.outputPath.convertToAvif` | `latex-graphics-helper.convertToAvif` |
| `latex-graphics-helper.outputPath.convertToSvg`  | `latex-graphics-helper.convertToSvg`  |

新設定の既定値は空文字にする。

空文字、またはトリム後に空文字になる値は「出力形式基準設定を使わない」という意味にする。

理由:

- VS Code設定はpackage manifestに既定値を持つため、通常の文字列既定値を入れると既存ペア別設定より常に優先されてしまう
- 既存ユーザーのペア別設定を壊さず、明示的に新設定を書いた場合だけ移行できる

### 優先順位

出力パス設定は以下の順で解決する。

1. 対応する `outputPath.convertTo*` が空文字（トリム後）でなければ使う
2. 空文字（トリム後）または未設定なら、既存ペア別 `outputPath.convertXToY` を使う
3. 既存ペア別設定も未設定なら、そのペア別設定の既定値を使う

例:

- PNG → PDFで `outputPath.convertToPdf` が空文字（トリム後）でなければ、それを使う
- PNG → PDFで `outputPath.convertToPdf` が空文字（トリム後）なら、`outputPath.convertPngToPdf` を使う
- PDF → PNGで `outputPath.convertToPng` が空文字（トリム後）でなければ、それを使う
- PDF → PNGで `outputPath.convertToPng` が空文字（トリム後）なら、`outputPath.convertPdfToPng` を使う

### ページ番号変数

PDFから画像・SVGへ変換する場合は、出力形式基準設定を使う場合でも `${page}` を使える。

PDF入力やDraw.io入力のようにページ単位の出力になる変換では、出力パスが同じ変換内で重複した場合に全体停止する。

`outputPath.convertToPng` などに `${page}` を含めるかどうかはユーザー設定に委ねる。ただし、複数ページ入力で `${page}` がなく出力先が重複する場合は、既存の重複検出により全体停止する。

ユーザーがこの挙動を理解しやすいよう、VS Code設定のdescriptionには、複数ページ入力の変換時には `${page}` を含める必要がある旨の注意書きを追加する。

### 既存設定の扱い

既存ペア別設定は、この移行では削除しない。

削除やdeprecated表示は、十分に移行期間を置いた後に別タスクで判断する。

既存設定のキーに誤りがある場合も、この仕様タスクでは修正しない。修正が必要なら別タスクで扱う。

## outputPathテンプレート変数の入力基準

`outputPath.*` のテンプレート変数は、変換途中に作る一時ファイルや中間ファイルではなく、ユーザーが選択した入力ファイルを基準に展開する。

例:

- PDFからPNGへ変換する場合、`${file}` は元PDFを指す
- Draw.ioからPNGへ変換する場合、`${file}` は中間PDFではなく元Draw.io入力を指す
- MermaidからPDFへ変換する場合、`${file}` は元Mermaidファイルを指す

editable Draw.io画像（`.drawio.png` / `.dio.png` / `.drawio.svg` / `.dio.svg`）は、画像ファイルではなくDraw.io入力として扱う。

この場合、テンプレート変数の基準には論理入力パスを使う。論理入力パスは、editable Draw.io画像の接尾辞を落としたパスとする。

| 選択された入力 | 論理入力パス |
| -------------- | ------------ |
| `a.drawio.png` | `a`          |
| `a.dio.png`    | `a`          |
| `a.drawio.svg` | `a`          |
| `a.dio.svg`    | `a`          |

理由:

- `a.drawio.png` は通常のPNGではなく、Draw.io編集情報を含む入力として扱うため
- defaultの `${fileBasenameNoExtension}.pdf` が `a.drawio.pdf` ではなく `a.pdf` になる方が直感的なため
- Draw.ioから画像への変換では中間PDFを作るが、その一時PDF名をユーザー向けの出力名へ漏らさないため

注意:

- `${fileExtname}` も論理入力パスから展開する
- editable Draw.io画像で元の画像拡張子そのものをテンプレートに使う変数は、現時点では提供しない
- 必要になった場合は、元ファイル名用の別変数を追加するタスクとして扱う

## 既存コマンドIDの移行方針

既存の入力形式・出力形式ペア別コマンドは、公開UIから外す。

例:

- `latex-graphics-helper.convertPngToPdf`
- `latex-graphics-helper.convertSvgToPdf`
- `latex-graphics-helper.convertPdfToPng`

当初は移行直後に互換用の非公開aliasを残してよいとしていたが、v1.0.0では旧command IDの互換aliasを実装しない。

理由:

- v1.0.0は破壊的変更を許容できる区切りとして扱う
- 旧command IDを残すと、公開UIから見えない入口のテスト・説明・保守が必要になる
- 変換コマンドを出力形式基準へ統一する目的が弱くなる

詳細な移行表は`docs/specs/v1-migration-from-v051.md`に記録する。

## Context menu

Explorer context menuでは、対象ファイルが対応入力形式のいずれかであれば、出力形式基準コマンドを表示する。

同じファイルに対して、入力形式ごとの変換項目を複数表示しない。

例:

- PNGを右クリックした場合:
  - `変換` > `PDF`
  - `変換` > `JPEG`
  - `変換` > `WebP`
  - `変換` > `AVIF`
- PNGに対して`変換` > `PNG`は表示しない

複数選択時にcontext menu条件だけで完全に判定できない場合は、command実行時に選択全体を検証し、非対応入力があれば全体停止する。

## Progress / Cancellation / Safe Mode / Undo

Webviewを使用しない出力形式基準コマンドは、`docs/specs/conversion-progress-and-cancellation.md`に従う。

- `vscode.window.withProgress`を使う
- `cancellable: true`にする
- command層で`AbortController`を作る
- core層は`AbortSignal`を受け取る
- 待機中の処理は`p-limit`で開始しない

出力反映は`docs/specs/safe-mode.md`に従う。

- Safe Mode ONで競合があればバッチ全体で1回確認する
- Safe Mode OFFでも上書き前にバックアップする
- Undoは直前の変換バッチ全体を対象にする

## サイズ仕様

テストでは、ファイルが存在することだけでなくサイズも確認する。

### 画像からPDF

画像からPDFへ変換する場合、PDFは1ページとする。

- PDFページ幅は画像のpixel幅と同じ数値のpointにする
- PDFページ高さは画像のpixel高さと同じ数値のpointにする
- 画像はページ全体に配置する
- PDFページサイズの比較許容誤差は`0.01pt`とする

例:

- 120px × 80pxのPNGをPDFへ変換する
- 生成PDFは1ページ
- ページサイズは120pt × 80pt

### SVGからPDF

SVGからPDFへ変換する場合、PDFは1ページとする。

- PDFページ幅はSVGの`width`または`viewBox`から決めた幅と同じ数値のpointにする
- PDFページ高さはSVGの`height`または`viewBox`から決めた高さと同じ数値のpointにする
- SVGからPDFへの変換方式は`latex-graphics-helper.convertToPdf.svg.engine`で選択する
- `puppeteer`を選択した場合は、`latex-graphics-helper.convertToPdf.svg.puppeteer.browserChannel`または`latex-graphics-helper.convertToPdf.svg.puppeteer.executablePath`で使用ブラウザを選択する
- `rsvg-convert`を選択した場合は、`latex-graphics-helper.execPath.rsvgConvert`を使用する

### PDFから画像

PDFから画像へ変換する場合、DPIから出力pixel数を決める。

計算式:

```text
pixelWidth = round(pageWidthPt / 72 * dpi)
pixelHeight = round(pageHeightPt / 72 * dpi)
```

テストでは、元PDFのページサイズ、DPI、出力画像metadataの幅・高さを比較する。

初期DPIは既存実装・設定を確認して、テスト追加前に対象タスクへ明記する。

### 画像から画像

画像から画像へ変換する場合、基本的に入力画像のpixel幅・高さを維持する。

フォーマット特性でmetadata差が出る場合は、対象形式のテストタスクで許容範囲を明記する。

### Draw.ioから画像

Draw.ioをPNG/JPEG/WebP/AVIFなどの画像へ変換する場合、Draw.io CLIの画像出力を直接使わず、必ずPDFを経由する。

理由:

- Draw.io CLIで直接PNG/JPEGへ出すと、数式が描画されないケースがある。
- PDF経由にすることで、Draw.io内の数式を保持した変換結果を優先する。

例:

```text
Draw.io → PDF → PNG
Draw.io → PDF → JPEG
```

PDF経由の中間ファイルは`.latex-graphics-helper/`配下に作成し、最終出力の反映はSafe Mode / Undoの通常フローに従う。

### SVG

SVGはpixelサイズ・viewBox・PDFページサイズの対応が実装方式に依存しやすいため、SVG変換のサイズ期待値は、SVG対応タスクで別途固定する。

## Mermaid入力

Mermaidファイル（`.mmd`、`.mermaid`）を変換対象に追加する。

### 変換エンジン

`@mermaid-js/mermaid-cli`を使用する。dependencyとして追加し、ユーザーに別途CLI installを求めない。

Mermaid CLIは内部でpuppeteerとchromiumを使用する。プロジェクト既存の`puppeteer-core`（ブラウザ別途）との関係は、実装前に`docs/research/`で確認する。

初期実装では、`@mermaid-js/mermaid-cli`の`run` APIを使う。

Mermaid CLIが使用するChromeは、Puppeteer管理ブラウザのinstallを前提にしない。
既定ではPuppeteer launch optionの`channel: "chrome"`を渡し、ユーザー環境にあるChromeを使う。
必要な場合は`settings.json`でブラウザ実行ファイルパスを指定できるようにする。

注意:

- Mermaid CLI READMEでNode.js APIはsemverで保証されない旨が示されている。
- 依存更新時は、VS Code command testで実変換を確認する。

### 変換経路

- Mermaid → SVG: Mermaid CLIで直接SVGへ変換する
- Mermaid → PNG: Mermaid CLIで直接PNGへ変換する
- Mermaid → PDF: Mermaid CLIで直接PDFへ変換する
- Mermaid → JPEG/WebP/AVIF: 生成したSVGまたはPNGを既存の変換経路へ渡す

Mermaid CLIが直接出力できる形式は、不要な中間変換を避けて直接出力する。

Mermaid専用の公開コマンドは作らず、出力形式基準コマンドへ入力形式として追加する。

各出力形式への対応は以下の実装に依存する。

- Mermaid → PDF: 実装済み
- Mermaid → SVG: 実装済み
- Mermaid → PNG: `convertToPng`を実装してMermaid入力を追加する
- Mermaid → JPEG: `convertToJpeg`を実装してMermaid入力を追加する
- Mermaid → WebP: `convertToWebp`を実装してMermaid入力を追加する
- Mermaid → AVIF: `convertToAvif`を実装してMermaid入力を追加する

### 初期実装スコープ

初期実装では、Mermaid → SVGを先に実装する。

他形式は段階的に追加する。SVG、PNG、PDFはMermaid CLIから直接出力し、JPEG、WebP、AVIFは生成したSVGまたはPNGを既存変換経路へ渡す。

初期実装ではMermaid CLIのデフォルト設定を使い、テーマ・背景色・フォント等の設定項目は公開しない。

### 出力パス設定

Mermaid変換用のoutputPath設定を個別に設ける。

| 設定キー                                                | 既定値                                           |
| ------------------------------------------------------- | ------------------------------------------------ |
| `latex-graphics-helper.outputPath.convertMermaidToSvg`  | `${fileDirname}/${fileBasenameNoExtension}.svg`  |
| `latex-graphics-helper.outputPath.convertMermaidToPdf`  | `${fileDirname}/${fileBasenameNoExtension}.pdf`  |
| `latex-graphics-helper.outputPath.convertMermaidToPng`  | `${fileDirname}/${fileBasenameNoExtension}.png`  |
| `latex-graphics-helper.outputPath.convertMermaidToJpeg` | `${fileDirname}/${fileBasenameNoExtension}.jpeg` |
| `latex-graphics-helper.outputPath.convertMermaidToWebp` | `${fileDirname}/${fileBasenameNoExtension}.webp` |
| `latex-graphics-helper.outputPath.convertMermaidToAvif` | `${fileDirname}/${fileBasenameNoExtension}.avif` |

### Safe Mode / Undo / progress / cancellation

既存変換と同じ扱いにする。このspecの`Progress / Cancellation / Safe Mode / Undo`および`docs/specs/safe-mode.md`に従う。

### サイズ仕様

Mermaid → SVGのサイズは、Mermaid CLIが出力するSVGの`width`/`height`/`viewBox`に依存する。

Mermaid → PDFは、Mermaid CLIが出力するPDFのページサイズに依存する。

Mermaid → PNGは、Mermaid CLIが出力する画像サイズに依存する。

Mermaid → JPEG/WebP/AVIFは、生成したSVGまたはPNGを既存の画像変換経路へ渡すため、`画像から画像`のサイズ仕様に従う。

## 実装順

出力形式基準への移行は段階的に行う。

1. `PDFに変換`のテストを追加する
2. `PDFに変換`を実装する
3. 残りの`PNGに変換`、`JPEGに変換`、`WebPに変換`、`AVIFに変換`、`SVGに変換`を同じ方針で展開する

全形式を一度に実装しない。

Mermaid入力も段階的に追加する。

1. Mermaid CLIのchromium依存について`docs/research/`で確認する
2. Mermaid → SVGを初期実装範囲にする
3. Mermaid → SVGの失敗テストを書く
4. `@mermaid-js/mermaid-cli`をdependencyへ追加し、Mermaid → SVGの最小実装を行う
5. context menuへ`.mmd`/`.mermaid`の対象出力形式を追加する
6. Mermaid → PDFへ拡張する
7. 残りのPNG/JPEG/WebP/AVIFへ段階的に拡張する
