# 外部コマンドのOS別path互換性調査

## 調査日

2026-07-11

## 対象

- Ghostscript
- pdftocairo（Poppler）
- rsvg-convert（librsvg）
- Draw.io Desktop CLI
- pdfcrop
- qpdf
- extension内の外部実体利用経路

## 公式情報源

- [Ghostscript documentation](https://ghostscript.readthedocs.io/en/latest/Use.html)
- [pdftocairo manual](https://manpages.debian.org/stable/poppler-utils/pdftocairo.1.en.html)
- [librsvg documentation](https://gnome.pages.gitlab.gnome.org/librsvg/devel-docs/product.html)
- [Draw.io Desktop公式repository](https://github.com/jgraph/drawio-desktop)
- [Draw.io Desktop公式releases](https://github.com/jgraph/drawio-desktop/releases)
- [CTAN: pdfcrop](https://ctan.org/pkg/pdfcrop)
- [qpdf: Unicode File Names](https://qpdf.readthedocs.io/en/stable/library.html#a-note-about-unicode-file-names)

## 現行実装との対応

| extension機能                  | 外部実体                 | 用途                                                                    |
| ------------------------------ | ------------------------ | ----------------------------------------------------------------------- |
| PDFをquick crop                | Ghostscript              | `bbox` deviceでページごとの内容境界を取得する                           |
| PDFをconfigure crop            | なし                     | pdf-libでCropBoxとMediaBoxを更新する                                    |
| PDF split / merge              | なし                     | pdf-libで処理する                                                       |
| PDFからPNG/JPEG/WebP/AVIF      | pdftocairo               | PDFの指定ページを一度PNGへ描画する                                      |
| PDFからSVG                     | pdftocairo               | PDFの指定ページをSVGへ変換する                                          |
| editable Draw.io画像から各形式 | Draw.io Desktop CLI      | 直接SVGまたは中間PDFへexportする                                        |
| SVGからPDF                     | rsvg-convertまたはChrome | ユーザー設定で選択したengineを使う                                      |
| Mermaidから各形式              | Mermaid CLIとChrome      | package APIからMermaid CLIを呼び、設定済みChromeで描画する              |
| raster画像変換                 | なし                     | sharpをprocess内で使う                                                  |
| pdfcrop                        | 現行実装では未使用       | v0.5.1系では利用していたがnext/v1ではGhostscriptとpdf-libへ置き換え済み |
| qpdf                           | 現行実装では未使用       | 将来のpreflightまたはPDF backend候補                                    |

## probe設計

固定fixtureを一時作業領域へコピーし、外部コマンドはshell文字列ではなく実行fileと引数配列に分けて呼び出す。

path componentには次を混在させる。

```text
日本語 العربية हिन्दी é 🌹　ＡＢＣ space
```

各ツールで次を別々に確認する。

- ASCIIのみのbaseline
- 入力file名だけが複雑なUnicode
- 入力directory名だけが複雑なUnicode
- 出力file名だけが複雑なUnicode
- 出力directory名だけが複雑なUnicode
- 入出力のfile名とdirectory名がすべて複雑なUnicode

Windowsでは全caseをnativeの`\\`とforward slashの`/`でそれぞれ実行する。macOSとLinuxでは`/`をnative separatorとして実行する。POSIXでは`\\`がseparatorではなく通常のfilename文字になるため、Windows形式を再現したことにはならずprobe対象にしない。

互換性の失敗は調査結果であり、probe process自体は継続する。実行結果、exit code、標準エラー、出力fileの有無とsize、所要時間をJSONとMarkdown artifactへ保存する。

## macOS実測結果

環境:

- macOS Darwin 25.5.0 / arm64
- Ghostscript 10.07.1
- pdftocairo 26.07.0
- rsvg-convert 2.62.3
- Draw.io Desktop 30.2.6
- pdfcrop 1.42
- qpdf 12.3.2

| Tool         | baseline | 入力file | 入力directory | 出力file | 出力directory | 全部混在 |
| ------------ | -------- | -------- | ------------- | -------- | ------------- | -------- |
| Ghostscript  | 成功     | 成功     | 成功          | 成功     | 成功          | 成功     |
| pdftocairo   | 成功     | 成功     | 成功          | 成功     | 成功          | 成功     |
| rsvg-convert | 成功     | 成功     | 成功          | 成功     | 成功          | 成功     |
| Draw.io CLI  | 成功     | 成功     | 成功          | 成功     | 成功          | 成功     |
| pdfcrop      | 成功     | 成功     | 成功          | 成功     | 成功          | 成功     |
| qpdf         | 成功     | 成功     | 成功          | 成功     | 成功          | 成功     |

Draw.io CLIはGUI application実体であるため、Codexの通常sandbox内ではbaselineもexit 134で失敗した。sandbox外で同じ引数配列を実行すると全caseが成功した。この失敗はpath互換性ではなく実行環境の制約として区別する。

## 公式情報から確認できた事実

- pdftocairoは入力PDFと出力fileまたはprefixを引数として受け取る
- rsvg-convertはSVGを複数の出力形式へrenderするCLIである
- Draw.io DesktopはLinux、macOS、Windowsの公式配布物をreleaseしている
- pdfcrop 1.42はPerl、Ghostscript、pdfTeX・XeTeX・LuaTeXのいずれかを必要とし、TeX LiveとMiKTeXに収録される
- qpdfはWindowsでUTF-8 filenameを内部的にwide characterへ変換し、Unicode対応Windows APIを使う。ただしerrorやCLI出力のfilename encodingにはrough edgeが残ると公式に記載されている

## 未確認事項

- Linux GitHub Actions上の各probe結果
- Windows GitHub Actionsでnative separatorとforward slashを使った場合の差
- macOS GitHub Actions上の各probe結果
- GitHub-hosted runnerでpdfcropを実行可能なTeX環境が存在するか
- Chrome executable path自体に複雑なUnicodeを含む場合のPuppeteer起動

## 判断

macOSでは、調査対象の外部コマンドへ一律にASCII stagingを追加する根拠は得られなかった。ASCII stagingの対象は、3 OSの実測で失敗したコマンドとpath位置に限定する。

pdfcropは現行next/v1製品で使っていないため、CIへ重いTeX distributionを新規導入してまで通常運用の対象にしない。runnerに存在する場合だけprobeし、存在しないOSは`unavailable`として記録する。

## 再確認条件

- 外部コマンドのversionまたは配布元を更新する場合
- qpdfまたはpdfcropを製品実装から呼び出す場合
- CI runner imageを変更する場合
- ASCII stagingを実装する場合
- Windowsのprocess起動方法を`execFile`以外へ変更する場合

## 関連

- [外部コマンドのOS別path互換性を実測する](../tasks/0141-audit-external-tool-path-compatibility.md)
- [外部コマンド用ASCII stagingの仕様を決める](../tasks/0142-design-ascii-staging-for-external-tools.md)
