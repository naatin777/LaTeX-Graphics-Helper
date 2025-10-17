<div align="center">
  <img alt="Project Icon" src="./assets/icon.svg" width=250>
  <h1>LaTeX Graphics Helper</h1>
  <img alt="GitHub License" src="https://img.shields.io/github/license/naatin777/LaTeX-Graphics-Helper">
  <img alt="GitHub Release" src="https://img.shields.io/github/v/release/naatin777/LaTeX-Graphics-Helper">
  <img alt="Visual Studio Marketplace Downloads" src="https://img.shields.io/visual-studio-marketplace/d/naatin777.latex-graphics-helper">
  <!-- <img alt="Open VSX Downloads" src="https://img.shields.io/open-vsx/dt/naatin777/LaTeX-Graphics-Helper"> -->
</div>

[English](README.md) | 日本語

VS Code で PDF や画像ファイルを直感的に扱えるように設計された拡張機能です。
PDF の結合、分割、トリミング、画像形式の相互変換、Draw.io ファイルの PDF 変換、Gemini AI を利用した LaTeX コード生成など、多彩な機能を提供します。

## デモ

<table>
  <tr>
    <td><img src="./assets/1.gif"></td>
    <td><img src="./assets/2.gif"></td>
  </tr>
  <tr>
    <td><img src="./assets/3.gif"></td>
    <td><img src="./assets/4.gif"></td>
  </tr>
</table>

## 機能

### PDF 操作
*   **トリミング**: 選択した PDF ファイルの余白をトリミングします。
*   **分割**: 選択した PDF ファイルを単一ページ PDF に分割します。
*   **結合**: 複数選択した PDF ファイルを 1 つに結合します。
*   **画像変換**: PDF ファイルを PNG, JPEG, SVG 形式に変換します。

### 画像・Draw.io 操作
*   **PDF 変換**: PNG, JPEG, SVG ファイルを PDF 形式に変換します。
*   **Draw.io から PDF 変換**: Draw.io ファイル (.drawio, .dio) を PDF に変換します。各タブは個別の PDF としてエクスポートされます。

### LaTeX コード生成
*   **PDF から挿入**: PDF ファイルを LaTeX ドキュメントにドラッグ&ドロップすると、対応する LaTeX コードが自動挿入されます。
*   **画像から挿入**: クリップボードの画像を LaTeX にペーストすると、LaTeX コードが自動挿入され、画像ファイルも保存されます。
*   **Gemini AI**: Gemini AI を使用して、クリップボードの画像から LaTeX コード（数式、表など）を生成します。

## インストール方法

この拡張機能は、以下のいずれかの方法でインストールできます。

*   **Visual Studio Code Marketplace**:
    VS Code 内の拡張機能マーケットプレイスから「LaTeX Graphics Helper」を検索し、インストールしてください。
    [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=naatin777.latex-graphics-helper)

*   **Open VSX Registry**:
    VS Code の代替マーケットプレイスである Open VSX からもインストール可能です。
    [Open VSX](https://open-vsx.org/extension/naatin777/latex-graphics-helper)

## 必要なツール

* **Draw.io**: Draw.io ファイル (.drawio, .dio) を PDF に変換するには、Draw.io デスクトップアプリケーションが必要です。 [Draw.io](https://github.com/jgraph/drawio-desktop/releases) からダウンロードしてください。
* **pdfcrop**: PDF のクロップ機能には **pdfcrop** が必要です。これは通常、TeX Live または MiKTeX に含まれています。
* **pdftocairo**: PDF を画像に変換する機能には **pdftocairo** が必要です。これは通常、Poppler ユーティリティに含まれています。
* **Google Chrome**: SVGを PDF に変換するには、**Google Chrome** が必要です。
* **Gemini AI**: Gemini AI 機能を使用するには、Gemini API キーが必要です。 [Google AI Studio](https://aistudio.google.com/app/apikey) で取得してください。
