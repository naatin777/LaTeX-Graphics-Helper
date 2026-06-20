<div align="center">
  <img alt="Project Icon" src="./assets/icon.png" width="250">
  <h1>LaTeX Graphics Helper</h1>
  <img alt="GitHub License" src="https://img.shields.io/github/license/naatin777/LaTeX-Graphics-Helper">
  <img alt="GitHub Release" src="https://img.shields.io/github/v/release/naatin777/LaTeX-Graphics-Helper">
</div>

[English](README.md) | 日本語

VS Code で PDF や画像ファイルを直感的に扱えるように設計された拡張機能です。
PDF の結合、分割、トリミング、画像形式の相互変換、Draw.io ファイルの PDF 変換など、多彩な機能を提供します。

## デモ

## 機能

### PDF 操作

- **PDF の余白トリミング**: 選択した PDF ファイルの余白をトリミングします。
- **PDF の分割**: PDF をページごとに単一ページ PDF として分割します。
- **PDF の結合**: 複数選択した PDF ファイルを 1 つの PDF に結合します。
- **PDF から画像への変換**: PDF ファイルを PNG, JPEG, SVG 形式に変換します。

### 画像・SVG・Draw.io 操作

- **画像から PDF への変換**: PNG, JPEG ファイルを PDF 形式に変換します。
- **SVG から PDF への変換**: SVG ファイルを PDF 形式に変換します。
- **Draw.io から PDF への変換**: Draw.io ファイル（`.drawio`, `.dio`）を PDF に変換します。複数ページを含む Draw.io ファイルでは、各ページを個別の PDF として出力します。

### LaTeX コード生成

- **PDF の LaTeX 挿入**: PDF ファイルを LaTeX ドキュメントにドラッグ&ドロップすると、`figure` / `includegraphics` を含む LaTeX コードを自動挿入します。
- **クリップボード画像の LaTeX 挿入**: クリップボードの画像を LaTeX ドキュメントに貼り付けると、画像ファイルを保存し、対応する LaTeX コードを挿入します。

## コマンド一覧

| 機能                            | 入力               | 出力                        | 主な用途                                | 必要な外部ツール                                              |
| ------------------------------- | ------------------ | --------------------------- | --------------------------------------- | ------------------------------------------------------------- |
| PDF の余白トリミング            | `.pdf`             | `.pdf`                      | 図版 PDF の余白を削除                   | `pdfcrop`, Ghostscript                                        |
| PDF の分割                      | `.pdf`             | `.pdf`                      | PDF をページごとに分割                  | Poppler                                                       |
| PDF の結合                      | 複数の `.pdf`      | `.pdf`                      | 複数の PDF を 1 つに結合                | Ghostscript                                                   |
| PDF から PNG 変換               | `.pdf`             | `.png`                      | PDF 図版を PNG として書き出し           | Poppler                                                       |
| PDF から JPEG 変換              | `.pdf`             | `.jpeg`                     | PDF 図版を JPEG として書き出し          | Poppler                                                       |
| PDF から SVG 変換               | `.pdf`             | `.svg`                      | PDF 図版を SVG として書き出し           | Poppler                                                       |
| PNG から PDF 変換               | `.png`             | `.pdf`                      | PNG 画像を PDF に変換                   | Ghostscript                                                   |
| JPEG から PDF 変換              | `.jpg`, `.jpeg`    | `.pdf`                      | JPEG 画像を PDF に変換                  | Ghostscript                                                   |
| SVG から PDF 変換               | `.svg`             | `.pdf`                      | SVG 図版を PDF に変換                   | `rsvg-convert` または Google Chrome / Chromium または Firefox |
| Draw.io から PDF 変換           | `.drawio`, `.dio`  | `.pdf`                      | Draw.io 図版を PDF に変換               | Draw.io Desktop                                               |
| PDF の LaTeX 挿入               | `.pdf`             | LaTeX コード                | `figure` / `includegraphics` を自動生成 | 不要                                                          |
| クリップボード画像の LaTeX 挿入 | クリップボード画像 | 画像ファイル + LaTeX コード | スクリーンショット等を LaTeX に貼り付け | 出力形式により異なります                                      |

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

| ツール                   | 用途                                      | 必須になる機能                                       | 備考                                                                    |
| ------------------------ | ----------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------- |
| Ghostscript              | PDF の生成・結合・画像から PDF への変換   | PDF 結合、PNG/JPEG から PDF 変換、PDF トリミング補助 | `gs` または `gswin64c` が利用可能である必要があります                   |
| Poppler                  | PDF から画像/SVG への変換、PDF ページ処理 | PDF 分割、PDF から PNG/JPEG/SVG 変換                 | `pdftocairo` などを使用します                                           |
| pdfcrop                  | PDF の余白トリミング                      | PDF トリミング                                       | 通常 TeX Live または MiKTeX に含まれています                            |
| rsvg-convert             | SVG から PDF への変換                     | SVG から PDF 変換                                    | SVG 変換バックエンドの 1 つです                                         |
| Google Chrome / Chromium | SVG から PDF への変換                     | SVG から PDF 変換                                    | `rsvg-convert` の代替バックエンドとして使用できます                     |
| Firefox                  | SVG から PDF への変換                     | SVG から PDF 変換                                    | `rsvg-convert` / Chrome / Chromium の代替バックエンドとして使用できます |
| Draw.io Desktop          | Draw.io ファイルの PDF 変換               | `.drawio`, `.dio` から PDF 変換                      | Draw.io デスクトップアプリケーションが必要です                          |

### すべての機能を利用する場合

すべての変換機能を利用するには、以下のツールが必要です。

- Ghostscript
- Poppler
- pdfcrop
- Draw.io Desktop
- SVG 変換バックエンドのいずれか
  - `rsvg-convert`
  - Google Chrome / Chromium
  - Firefox

### SVG から PDF への変換について

SVG から PDF への変換には、以下のいずれかのツールが必要です。

```text
rsvg-convert または Google Chrome / Chromium または Firefox
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
- Poppler
- TeX Live または MiKTeX
- Draw.io Desktop
- Google Chrome / Chromium または Firefox

## 設定

主な設定項目は以下の通りです。

| 設定                                          | 既定値         | 説明                                                                                                                      |
| --------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `latex-graphics-helper.pasteClipboardImageAs` | `ask`          | クリップボード画像の LaTeX への貼り付け方法です。`ask` では PDF / 画像を選択し、`pdf` または `image` では選択を省略します |
| `latex-graphics-helper.execPath.drawio`       | 空文字         | Draw.io 実行ファイルへのパスです。未指定の場合は OS ごとの既定コマンドを使用します                                        |
| `latex-graphics-helper.execPath.pdfcrop`      | `pdfcrop`      | `pdfcrop` 実行ファイルへのパスです                                                                                        |
| `latex-graphics-helper.execPath.pdftocairo`   | `pdftocairo`   | `pdftocairo` 実行ファイルへのパスです                                                                                     |
| `latex-graphics-helper.execPath.rsvgConvert`  | `rsvg-convert` | `rsvg-convert` 実行ファイルへのパスです                                                                                   |
| `latex-graphics-helper.execPath.gs`           | 空文字         | Ghostscript 実行ファイルへのパスです。未指定の場合は OS ごとの既定コマンドを使用します                                    |

出力ファイル名や LaTeX snippet の候補も VS Code の設定から変更できます。

## Output パネル

コマンド実行ログ、バッチ処理の進行状況、外部ツールのエラーは VS Code の Output パネルで確認できます。

```text
表示 → 出力 → LaTeX Graphics Helper
```

## トラブルシューティング

### コマンドが失敗する

外部ツールがインストールされているか確認してください。

```sh
gs --version
pdftocairo -v
pdfcrop --version
rsvg-convert --version
```

Windows では、実行ファイル名や PATH の設定によりコマンドが見つからない場合があります。その場合は、VS Code の設定から各ツールの実行ファイルパスを指定してください。

### PDF のトリミングに失敗する

`pdfcrop` と Ghostscript が利用可能か確認してください。`pdfcrop` は通常 TeX Live または MiKTeX に含まれています。

### PDF から画像への変換に失敗する

Poppler がインストールされ、`pdftocairo` が実行可能か確認してください。

### SVG から PDF への変換に失敗する

`rsvg-convert`、Google Chrome / Chromium、Firefox のいずれかが利用可能か確認してください。

### Draw.io ファイルの変換に失敗する

Draw.io Desktop がインストールされているか確認してください。必要に応じて `latex-graphics-helper.execPath.drawio` に実行ファイルのパスを指定してください。

## ライセンス

MIT
