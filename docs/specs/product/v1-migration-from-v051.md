# v1.0.0 migration note: v0.5.1からの破壊的変更

## 目的

`v0.5.1`で公開されていたcommand IDとsettingsから、`v1.0.0`へ移行するときの破壊的変更を記録する。

`v1.0.0`では、旧command IDの互換aliasを実装しない。

理由:

- v1ではcontext menuをサブメニュー化し、操作単位を整理する
- 変換コマンドは入力形式・出力形式ペア別ではなく、出力形式基準へ統合する
- 旧command IDを残すと、同じ機能に複数の入口ができてテスト対象と説明対象が増える
- 破壊的変更はv1.0.0のmigration note / CHANGELOG / READMEで明示する

## command IDの移行

| v0.5.1 command ID                          | v1.0.0で使うcommand ID                         | 備考                                                                                                                             |
| ------------------------------------------ | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `latex-graphics-helper.cropPdf`            | `latex-graphics-helper.cropPdf.auto`           | quick系の自動crop。Webview GUIで細かく指定するcropは `latex-graphics-helper.cropPdf.configure` として別入口にする。              |
| `latex-graphics-helper.splitPdf`           | `latex-graphics-helper.splitPdf.allPages`      | quick系の全ページsplit。Webview GUIでページを選択するsplitは `latex-graphics-helper.splitPdf.configure` として別入口にする。     |
| `latex-graphics-helper.mergePdf`           | `latex-graphics-helper.mergePdf.selectedFiles` | quick系の選択PDF結合。Webview GUIで順序やページを指定するmergeは `latex-graphics-helper.mergePdf.configure` として別入口にする。 |
| `latex-graphics-helper.convertDrawioToPdf` | `latex-graphics-helper.convertToPdf`           | Draw.io入力をPDF出力形式コマンドへ統合する。                                                                                     |
| `latex-graphics-helper.convertPdfToPng`    | `latex-graphics-helper.convertToPng`           | PDF入力をPNG出力形式コマンドへ統合する。                                                                                         |
| `latex-graphics-helper.convertPdfToJpeg`   | `latex-graphics-helper.convertToJpeg`          | PDF入力をJPEG出力形式コマンドへ統合する。                                                                                        |
| `latex-graphics-helper.convertPdfToSvg`    | `latex-graphics-helper.convertToSvg`           | PDF入力をSVG出力形式コマンドへ統合する。                                                                                         |
| `latex-graphics-helper.convertPngToPdf`    | `latex-graphics-helper.convertToPdf`           | PNG入力をPDF出力形式コマンドへ統合する。                                                                                         |
| `latex-graphics-helper.convertJpegToPdf`   | `latex-graphics-helper.convertToPdf`           | JPEG入力をPDF出力形式コマンドへ統合する。                                                                                        |
| `latex-graphics-helper.convertSvgToPdf`    | `latex-graphics-helper.convertToPdf`           | SVG入力をPDF出力形式コマンドへ統合する。                                                                                         |

## 旧command IDの互換alias

旧command IDの互換aliasは実装しない。

影響:

- ユーザーがVS Code keybindingsやtasksから旧command IDを直接呼んでいる場合は、新command IDへ変更する必要がある
- Explorer context menuから使う場合は、v1.0.0の新しいサブメニューを使う
- Command Paletteから使う場合は、新しい出力形式基準の表示名を検索する

## settingsの移行

### `latex-graphics-helper.execPath.pdfcrop`

`v1.0.0`では復元しない。

移行先:

- `latex-graphics-helper.execPath.ghostscript`

理由:

- 現行のcrop処理は`pdfcrop`ではなくGhostscript基準へ変更している
- Windows path handlingなど、`pdfcrop`固有の問題を避ける
- 依存する外部ツールを整理する

README / CHANGELOG / migration noteには、`execPath.pdfcrop`が廃止され、cropには`execPath.ghostscript`を使うことを書く。

### `latex-graphics-helper.execPath.puppeteer`

`v1.0.0`では復元しない。

移行先:

- SVG → PDF: `latex-graphics-helper.convertToPdf.svg.puppeteer.executablePath`
- Mermaid: `latex-graphics-helper.mermaid.puppeteer.executablePath`

理由:

- SVG変換とMermaid CLIでは利用箇所ごとの設定が必要になる
- Mermaidの出力形式間では同じ設定を共有する
- 全機能共通のPuppeteer executable pathにすると、どの変換に効く設定か分かりにくい
- v1では用途別設定を優先する

### `latex-graphics-helper.puppeteer.browser`

`v1.0.0`では復元しない。

移行先は設けない。

理由:

- 現行のPuppeteer利用はChrome系channel / executable pathで制御する
- Firefox対応を公開設定として維持する実装・検証を行っていない
- 使えるように見えるが動作保証できない設定を残さない

### `latex-graphics-helper.puppeteer.channel`

`v1.0.0`では復元しない。

移行先:

- SVG → PDF: `latex-graphics-helper.convertToPdf.svg.puppeteer.browserChannel`
- Mermaid: `latex-graphics-helper.mermaid.puppeteer.browserChannel`

理由:

- `execPath.puppeteer`と同じく、SVG変換とMermaid CLIの設定境界を分ける
- Mermaidの出力形式間では同じchannel設定を共有する
- 変換処理ごとの検証範囲を明確にする

## READMEに書く内容

READMEでは、詳細な互換表をすべて載せすぎず、以下を短く書く。

- v1.0.0ではcommand IDが整理され、旧command IDは互換aliasとして残らない
- 変換コマンドは`PDFに変換` / `PNGに変換`のような出力形式基準になった
- keybindingsやtasksで旧command IDを使っている場合はmigration noteを参照する
- `execPath.pdfcrop`は廃止され、cropには`execPath.ghostscript`を使う
- Puppeteer設定は用途別設定へ移行した

Mermaidの出力形式別legacy設定は、共通Mermaid設定が未指定の場合だけfallbackとして使用される。

## CHANGELOGに書く内容

CHANGELOGでは、`BREAKING CHANGE`として以下を明記する。

- 旧command IDの互換aliasを提供しない
- 変換コマンドを出力形式基準へ統合した
- PDF操作コマンドはサブメニュー化し、quick系は`cropPdf.auto` / `splitPdf.allPages` / `mergePdf.selectedFiles`、Webview GUI系は`cropPdf.configure` / `splitPdf.configure` / `mergePdf.configure`などの具体的なcommand IDへ移行した
- `execPath.pdfcrop`を廃止し、`execPath.ghostscript`へ移行した
- 共通Puppeteer設定を廃止し、用途別Puppeteer設定へ移行した

## migration noteに書く内容

migration noteでは、このファイルの以下の表をユーザー向けに整えて掲載する。

- command ID移行表
- settings移行表
- 旧command ID aliasを実装しないこと
- keybindings / tasks / 外部automationで旧command IDを使っている場合の修正例

## 関連

- `docs/specs/product/output-format-conversion.md`
- `docs/tasks/0112-track-v051-public-feature-parity.md`
- `docs/tasks/0115-decide-v051-legacy-compatibility.md`
