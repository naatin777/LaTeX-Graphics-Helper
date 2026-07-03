# タスク: v0.5.1公開機能との差分を整理する

## Status

Done

## 目的

mainブランチの `v0.5.1` で公開されていたコマンド・設定を基準に、現行 `next/v1` で未実装または互換性判断が必要なものを整理する。

## 調査結果

`v0.5.1` では以下のコマンドが公開されていた。

- `latex-graphics-helper.cropPdf`
- `latex-graphics-helper.splitPdf`
- `latex-graphics-helper.mergePdf`
- `latex-graphics-helper.convertDrawioToPdf`
- `latex-graphics-helper.convertPdfToPng`
- `latex-graphics-helper.convertPdfToJpeg`
- `latex-graphics-helper.convertPdfToSvg`
- `latex-graphics-helper.convertPngToPdf`
- `latex-graphics-helper.convertJpegToPdf`
- `latex-graphics-helper.convertSvgToPdf`

現行 `next/v1` では、変換系は出力形式基準コマンドへ統合している。

- `convertToPdf`
- `convertToPng`
- `convertToJpeg`
- `convertToWebp`
- `convertToAvif`
- `convertToSvg`

そのため、変換系の旧command IDは「未実装」ではなく、v1.0.0へ向けた破壊的変更として扱う。

旧command IDの互換aliasは実装しない。必要なのは、README / CHANGELOG / migration note へ移行先を明記すること。

PDF操作については以下の状態。

- `cropPdf`
  - 現行では `cropPdf.auto` が相当する
  - 旧command ID互換aliasは実装しない
- `splitPdf`
  - 現行では `splitPdf.allPages` が相当する
  - 旧command ID互換aliasは実装しない
- `mergePdf`
  - v0.5.1相当の基本結合コマンドが現行 `src/extension.ts` に登録されていない
  - 旧command IDは復元しない
  - 当初は `mergePdf.selectedPages` または `mergePdf.manual` として整理していた
  - 後続方針では、基本結合は `mergePdf.selectedFiles`、Webview GUIは `mergePdf.configure` へ寄せる

`v0.5.1` では、LaTeX文書上で以下の挿入機能が提供されていた。

- PDFファイルをdrag & dropして `figure` / `includegraphics` のLaTeX snippetを挿入する
- 複数PDFファイルをdrag & dropして `subfigure` 相当のLaTeX snippetを挿入する
- クリップボード画像をpasteして、画像ファイルまたはPDFとして保存し、LaTeX snippetを挿入する

現行 `next/v1` では、`src/edit_provider/` 配下の `LatexDropEditProvider` / `LatexPasteEditProvider` 相当の実装が見当たらない。

また、`v0.5.1` では以下のLaTeX挿入関連settingsが公開されていた。

- `latex-graphics-helper.outputPath.clipboardImage`
- `latex-graphics-helper.figure.placementOptions`
- `latex-graphics-helper.figure.alignmentOptions`
- `latex-graphics-helper.figure.graphicsOptions`
- `latex-graphics-helper.subfigure.verticalAlignmentOptions`
- `latex-graphics-helper.subfigure.widthOptions`
- `latex-graphics-helper.subfigure.spacingOptions`

現行 `package.json` のconfigurationでは、これらのsettingsが見当たらない。PDF / clipboard画像のLaTeX挿入機能を維持するなら、provider実装とsettingsの復元が必要。

`v0.5.1` の `execPath.pdfcrop` は、現行のPDF cropがGhostscript基準へ変わっているため、単純復元せず互換性・移行説明の判断対象とする。

`v0.5.1` の `execPath.puppeteer` / `puppeteer.browser` / `puppeteer.channel` は、現行の用途別Puppeteer設定へ移行しているため、旧設定を復元せず移行説明に留める。

## 完了条件

- v0.5.1で公開されていたコマンド・設定が整理されている
- 現行実装で相当機能があるものと、未実装のものが分けられている
- 旧command ID互換aliasを実装しない方針が明記されている
- 追加タスクへ分割されている

## 変更可能なファイル

- `docs/tasks/0048-track-unimplemented-work.md`
- `docs/tasks/0112-track-v051-public-feature-parity.md`
- 新規 `docs/tasks/*.md`
- `docs/tasks/README.md`

## 対象外

- 実装
- テスト追加
- package.json変更

## 関連

- [0048: 未実装・保留事項を整理する](0048-track-unimplemented-work.md)

## 確認方法

- `git diff --check`
