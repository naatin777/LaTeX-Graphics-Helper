<div align="center">
  <h1>LaTeX Graphics Helper</h1>
  <img alt="GitHub License" src="https://img.shields.io/github/license/naatin777/LaTeX-Graphics-Helper">
  <img alt="GitHub Release" src="https://img.shields.io/github/v/release/naatin777/LaTeX-Graphics-Helper">
</div>

[English](README.md) | 日本語

VS Code で PDF や画像ファイルを直感的に扱えるように設計された拡張機能です。
PDF の分割、トリミング、PDF・画像・SVG・Mermaid・Draw.io ファイルの形式変換、LaTeX コード生成などを提供します。

## 機能

### PDF 操作

- **PDF の余白トリミング**: 選択した PDF ファイルの余白をトリミングします。
- **PDF の分割**: PDF をページごとに単一ページ PDF として分割します。
- **PDF の結合**: 複数選択した PDF ファイルを 1 つの PDF に結合します。

### 変換

- **出力形式を選ぶ変換**: Explorer の右クリックメニューでは `変換 > PDF` / `変換 > PNG` / `変換 > JPEG` / `変換 > WebP` / `変換 > AVIF` / `変換 > SVG` のように、出力形式を選んで変換します。
- **PDF / 画像 / SVG / Mermaid / editable Draw.io の変換**: 対応入力を、選択した出力形式へまとめて変換します。
- **混在選択**: 同じ出力形式へ変換できる複数形式のファイルを、1回の操作で変換できます。
- **ネイティブDraw.ioのPDF変換**: `.drawio` / `.dio` をページごとのPDF、または全ページを含む1つのPDFへ変換できます。

### LaTeX コード生成

- **PDF の LaTeX 挿入**: PDF ファイルを LaTeX ドキュメントにドラッグ&ドロップすると、`figure` / `includegraphics` を含む LaTeX コードを自動挿入します。
- **クリップボード画像の LaTeX 挿入**: クリップボードの画像を LaTeX ドキュメントに貼り付けると、PDF / 画像のどちらで保存するかを選び、保存先を編集してから、対応する LaTeX コードを挿入します。

## コマンド一覧

| 機能                            | 入力                                                                                                               | 出力                        | 主な用途                                | 必要な外部ツール                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------- | --------------------------------------- | -------------------------------------------------------- |
| PDF の余白トリミング            | `.pdf`                                                                                                             | `.pdf`                      | 図版 PDF の余白を削除                   | Ghostscript                                              |
| PDF の分割                      | `.pdf`                                                                                                             | `.pdf`                      | PDF をページごとに分割                  | 不要                                                     |
| PDF へ変換                      | `.png`, `.jpg`, `.jpeg`, `.webp`, `.avif`, `.gif`, `.tif`, `.tiff`, `.eps`                                         | `.pdf`                      | ラスター画像/EPSを PDF に変換           | EPS入力ではGhostscript                                   |
| PDF へ変換                      | `.svg`, `.mmd`, `.mermaid`, editable Draw.io 画像                                                                  | `.pdf`                      | 図版ファイルを PDF に変換               | 入力形式により異なります                                 |
| Draw.ioをページごとのPDFへ変換  | `.drawio`, `.dio`, editable Draw.io 画像                                                                           | ページごとのPDF             | Draw.ioの各ページを個別に出力           | Draw.io Desktop                                          |
| Draw.ioを1つのPDFへ変換         | `.drawio`, `.dio`, editable Draw.io 画像                                                                           | 1つのPDF                    | Draw.ioの全ページをまとめて出力         | Draw.io Desktop                                          |
| PNG へ変換                      | `.pdf`, `.jpg`, `.jpeg`, `.webp`, `.avif`, `.gif`, `.tif`, `.tiff`, `.eps`, `.svg`, Mermaid, editable Draw.io 画像 | `.png`                      | 図版ファイルを PNG に変換               | PDF/EPS入力ではPoppler                                   |
| JPEG へ変換                     | `.pdf`, `.png`, `.webp`, `.avif`, `.gif`, `.tif`, `.tiff`, `.eps`, `.svg`, Mermaid, editable Draw.io 画像          | `.jpeg`                     | 図版ファイルを JPEG に変換              | PDF/EPS入力ではPoppler                                   |
| WebP へ変換                     | `.pdf`, `.png`, `.jpg`, `.jpeg`, `.avif`, `.gif`, `.tif`, `.tiff`, `.eps`, `.svg`, Mermaid, editable Draw.io 画像  | `.webp`                     | 図版ファイルを WebP に変換              | PDF/EPS入力ではPoppler                                   |
| AVIF へ変換                     | `.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.tif`, `.tiff`, `.eps`, `.svg`, Mermaid, editable Draw.io 画像  | `.avif`                     | 図版ファイルを AVIF に変換              | PDF/EPS入力ではPoppler                                   |
| SVG へ変換                      | `.pdf`, `.mmd`, `.mermaid`, editable Draw.io 画像                                                                  | `.svg`                      | 図版ファイルを SVG に変換               | PDF入力はPoppler、MermaidはChrome、editable画像はDraw.io |
| PDF の LaTeX 挿入               | `.pdf`                                                                                                             | LaTeX コード                | `figure` / `includegraphics` を自動生成 | 不要                                                     |
| クリップボード画像の LaTeX 挿入 | クリップボード画像                                                                                                 | 画像ファイル + LaTeX コード | スクリーンショット等を LaTeX に貼り付け | 出力形式により異なります                                 |

GIF/TIFF入力は先頭page/frameだけを使用します。EPS入力にはGhostscriptが必要で、staged PDFを経由して変換します。

## インストール方法

この拡張機能は、以下のいずれかの方法でインストールできます。

### Visual Studio Code Marketplace

VS Code 内の拡張機能マーケットプレイスから **LaTeX Graphics Helper** を検索し、インストールしてください。

[Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=naatin777.latex-graphics-helper)

### Open VSX Registry

Open VSX Registry からもインストールできます。

[Open VSX](https://open-vsx.org/extension/naatin777/latex-graphics-helper)

## 外部依存関係

一部の機能では、VS Code 拡張機能とは別に外部ツールが必要です。使用する機能に応じて、必要なツールをインストールしてください。

| ツール                   | 用途                                        | 必須になる機能                                                          | 備考                                                                           |
| ------------------------ | ------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Ghostscript              | PDF の余白検出                              | PDF トリミング                                                          | `gs` または `gswin64c` が利用可能である必要があります                          |
| Poppler / `pdftocairo`   | PDFページの画像化                           | PDFからPNG/JPEG/WebP/AVIF/SVGへの変換                                   | macOS: `brew install poppler`、Debian/Ubuntu: `sudo apt install poppler-utils` |
| rsvg-convert             | SVG から PDF への変換                       | `rsvg-convert`バックエンドを選択した場合                                | SVG 変換バックエンドの 1 つです                                                |
| Google Chrome / Chromium | SVG / Mermaid 変換                          | SVG から PDF、Mermaid から PDF/PNG/JPEG/WebP/AVIF/SVG                   | Puppeteer / Mermaid CLI から使用します                                         |
| Draw.io Desktop          | Draw.ioファイルとeditable Draw.io画像の変換 | `.drawio`, `.dio`, `.drawio.png`, `.dio.png`, `.drawio.svg`, `.dio.svg` | Draw.io デスクトップアプリケーションが必要です                                 |
| Firefox                  | SVG から PDF への変換                       | `puppeteer.browser` を `firefox` にした場合                             | Firefox の実行ファイルが必要です                                               |

### すべての機能を利用する場合

すべての変換機能を利用するには、以下のツールが必要です。

- Ghostscript
- Poppler / `pdftocairo`
- Draw.io Desktop
- SVG 変換バックエンドのいずれか
  - `rsvg-convert`
  - Google Chrome / Chromium
- Mermaid変換を使う場合は Google Chrome / Chromium

### SVG から PDF への変換について

SVG から PDF への変換には、以下のいずれかのツールが必要です。

```text
rsvg-convert または Google Chrome / Chromium
```

環境に応じて利用可能な変換バックエンドを使用してください。

## 外部ツールのインストール例

### macOS

```sh
brew install ghostscript poppler librsvg
```

Draw.io Desktop は以下からインストールしてください。

[Draw.io Desktop](https://github.com/jgraph/drawio-desktop/releases)

### Debian / Ubuntu

```sh
sudo apt install ghostscript poppler-utils librsvg2-bin
```

Draw.io Desktop は以下からインストールしてください。

[Draw.io Desktop](https://github.com/jgraph/drawio-desktop/releases)

### Windows

以下のツールをインストールし、必要に応じて実行ファイルへのパスを VS Code の設定で指定してください。

- Ghostscript
- Poppler（`pdftocairo`）
- Draw.io Desktop
- Google Chrome / Chromium

## 設定

主な設定項目は以下の通りです。

| 設定                                                          | 既定値                                          | 説明                                                                                                           |
| ------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `latex-graphics-helper.outputPath.clipboardImage`             | `${fileDirname}/${dateNow}`                     | クリップボード画像を貼り付けるときに表示する既定の保存先です。貼り付け時に編集でき、拡張子は自動で追加されます |
| `latex-graphics-helper.figure.placementOptions`               | `[H]` など                                      | `figure` 環境の配置オプション候補です                                                                          |
| `latex-graphics-helper.figure.alignmentOptions`               | `\centering` など                               | `figure` 内の配置コマンド候補です                                                                              |
| `latex-graphics-helper.figure.graphicsOptions`                | `[width=1.0\linewidth]` など                    | `includegraphics` のオプション候補です                                                                         |
| `latex-graphics-helper.subfigure.verticalAlignmentOptions`    | `[t]` など                                      | 複数PDFをdropしたときの `minipage` 縦位置候補です                                                              |
| `latex-graphics-helper.subfigure.widthOptions`                | `{0.45\linewidth}` など                         | 複数PDFをdropしたときの `minipage` 幅候補です                                                                  |
| `latex-graphics-helper.subfigure.spacingOptions`              | `\hspace{0.01\linewidth}` など                  | 複数PDFをdropしたときの図間スペース候補です                                                                    |
| `latex-graphics-helper.execPath.drawio`                       | 空文字                                          | Draw.io 実行ファイルへのパスです。未指定の場合は OS ごとの既定コマンドを使用します                             |
| `latex-graphics-helper.execPath.ghostscript`                  | 空文字                                          | Ghostscript 実行ファイルへのパスです。未指定の場合は OS ごとの既定コマンドを使用します                         |
| `latex-graphics-helper.execPath.pdftocairo`                   | `pdftocairo`                                    | `pdftocairo` 実行ファイルへのパスです                                                                          |
| `latex-graphics-helper.execPath.rsvgConvert`                  | `rsvg-convert`                                  | `rsvg-convert` 実行ファイルへのパスです                                                                        |
| `latex-graphics-helper.convertToPdf.svg.engine`               | `puppeteer`                                     | SVGをPDFへ変換するときのバックエンドです。`puppeteer` または `rsvg-convert` を選択できます                     |
| `latex-graphics-helper.puppeteer.browser`                     | `chrome`                                        | SVG変換でPuppeteerが使用するブラウザです。`chrome` または `firefox` を選択できます                             |
| `latex-graphics-helper.mermaid.puppeteer.browserChannel`      | `chrome`                                        | Mermaid CLIが使用するChromeチャンネルです                                                                      |
| `latex-graphics-helper.puppeteer.executablePath`              | 空文字                                          | SVG変換とMermaid変換で共有するブラウザ実行ファイルです。チャンネルより優先されます                             |
| `latex-graphics-helper.outputPath.convertDrawioToPdfDirectly` | `${fileDirname}/${fileBasenameNoExtension}.pdf` | Draw.ioの全ページを1つのPDFへ出力するパスです                                                                  |
| `latex-graphics-helper.convertToWebp.effort`                  | `4`                                             | WebP出力のエンコードeffortです                                                                                 |
| `latex-graphics-helper.convertToAvif.effort`                  | `4`                                             | AVIF出力のエンコードeffortです                                                                                 |

出力ファイル名や LaTeX snippet の候補も VS Code の設定から変更できます。

`outputPath.convertToPdf`などの出力形式別設定を優先し、空、空白のみ、または未設定の場合はlegacyの入力形式と出力形式のペア別設定へfallbackします。legacy設定は互換性のために保持し、次のmajor version前に利用実態を確認して廃止時期を決めます。

## Output パネル

必要なコマンド入力、外部ツールのエラー、競合解決、確定した出力、cleanup失敗は VS Code の Output パネルで確認できます。バッチの進行状況は通知に表示されます。

```text
表示 → 出力 → LaTeX Graphics Helper
```

## Safe Mode と Undo

Safe Mode は初期状態で有効です。既存の出力を上書きする前に、**Keep Both**、**Do Not Overwrite**、**Overwrite**を選択します。Undo は最後に完了した変換、結合、クロップ、分割、クリップボード貼り付けに対して利用でき、生成後に変更された出力は取り消しません。Undo はメモリ上だけに保持されるため、拡張機能の再起動後は利用できません。

通常のstagingは、変換の成功後、失敗時、キャンセル時、Undo成功後に不要なものが削除されます。上書き前のbackupは現在のUndo recordが必要な間だけ保持されます。拡張機能起動時にruntime root全体を削除しないため、crash後の残骸が残る場合があります。これは別windowの実行中staging、Undo backup、未知のdirectory、診断用scratchを保護するためです。診断用のASCII scratchは別管理のため、外部ツール失敗時に残る場合があります。

## トラブルシューティング

### コマンドが失敗する

外部ツールがインストールされているか確認してください。

```sh
gs --version
rsvg-convert --version
```

Windows では、実行ファイル名や PATH の設定によりコマンドが見つからない場合があります。その場合は、VS Code の設定から各ツールの実行ファイルパスを指定してください。

### PDF のトリミングに失敗する

Ghostscript が利用可能か確認してください。

### SVG から PDF への変換に失敗する

設定した変換方式に応じて、`rsvg-convert`または Google Chrome / Chromium が利用可能か確認してください。

### Mermaid ファイルの変換に失敗する

Google Chrome / Chromium が利用可能か確認してください。必要に応じて Mermaid 変換用のブラウザ実行ファイルパスを VS Code の設定で指定してください。

### editable Draw.io 画像の変換に失敗する

Draw.io Desktop がインストールされているか確認してください。必要に応じて `latex-graphics-helper.execPath.drawio` に実行ファイルのパスを指定してください。

## ライセンス

MIT
