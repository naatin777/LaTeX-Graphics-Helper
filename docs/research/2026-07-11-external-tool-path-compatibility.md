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

- Chrome executable path自体に複雑なUnicodeを含む場合のPuppeteer起動

## GitHub Actions実測環境

[External Tool Path Probe run #2](https://github.com/naatin777/LaTeX-Graphics-Helper/actions/runs/29142706622)で、固定fixtureを各runnerの一時directoryへコピーして実測した。

| OS          | Ghostscript | pdftocairo | rsvg-convert | Draw.io | pdfcrop     | qpdf   |
| ----------- | ----------- | ---------- | ------------ | ------- | ----------- | ------ |
| Linux x64   | 10.02.1     | 24.02.0    | 2.58.0       | 30.0.4  | unavailable | 11.9.0 |
| macOS arm64 | 10.07.1     | 26.06.0    | 2.62.3       | 30.0.4  | unavailable | 12.3.2 |
| Windows x64 | 10.07.1     | 24.08.0    | 2.0          | 30.0.4  | unavailable | 12.3.2 |

Windowsのpdftocairoは`oschwartz10612/poppler-windows`配布物、rsvg-convertは既存CIが利用する`miyako/console-rsvg-convert`配布物である。upstream projectが同じでも、別のWindows配布物で同じ結果になるとは未確認である。

## GitHub Actions実測結果

1 OS・1 toolあたり、基本6 caseと文字種別16 caseの計22 caseを実行した。Windowsではnative separatorとforward slashの両方を実行したため計44 caseである。

| OS      | Tool         | 成功 | 失敗 | 結果                                       |
| ------- | ------------ | ---: | ---: | ------------------------------------------ |
| Linux   | Ghostscript  |   22 |    0 | 全case成功                                 |
| Linux   | pdftocairo   |   22 |    0 | 全case成功                                 |
| Linux   | rsvg-convert |   22 |    0 | 全case成功                                 |
| Linux   | Draw.io      |   22 |    0 | 全case成功                                 |
| Linux   | qpdf         |   22 |    0 | 全case成功                                 |
| macOS   | Ghostscript  |   22 |    0 | 全case成功                                 |
| macOS   | pdftocairo   |   22 |    0 | 全case成功                                 |
| macOS   | rsvg-convert |   22 |    0 | 全case成功                                 |
| macOS   | Draw.io      |   22 |    0 | 全case成功                                 |
| macOS   | qpdf         |   22 |    0 | 全case成功                                 |
| Windows | Ghostscript  |   26 |   18 | Hindiとemojiを含む入出力で失敗             |
| Windows | pdftocairo   |   24 |   20 | 非ASCII出力名が文字化け。非ASCII入力は成功 |
| Windows | rsvg-convert |    6 |   38 | ASCII空白以外の非ASCII入出力で失敗         |
| Windows | Draw.io      |   44 |    0 | 両separatorの全case成功                    |
| Windows | qpdf         |   44 |    0 | 両separatorの全case成功                    |

pdfcropは3 OSのGitHub-hosted runnerにTeX環境がなく`unavailable`だった。現行next/v1はpdfcropを利用していないため、この調査だけを目的にTeX distributionをCIへ追加しない。手元macOSのpdfcrop 1.42では22 caseがすべて成功した。

### Windows Ghostscript

文字種別の結果はnative separatorとforward slashで同一だった。

| 文字種       | 入力file | 出力file       |
| ------------ | -------- | -------------- |
| 日本語       | 成功     | 成功           |
| アラビア語   | 成功     | 成功           |
| ヒンディー語 | 失敗     | 失敗・別名出力 |
| 結合文字     | 成功     | 成功           |
| 絵文字       | 失敗     | 失敗・別名出力 |
| 全角英数字   | 成功     | 成功           |
| 半角空白     | 成功     | 成功           |
| 全角空白     | 成功     | 成功           |

入力失敗時はexit 1でも途中PDFが残る場合がある。出力file名を正しく扱えない場合は、exit 0でも期待pathには出力されず、replacement characterを含む別名が生成される場合がある。exit codeだけで成功判定してはいけない。

### Windows pdftocairo

全文字種の入力fileを正常に読み込めた。出力file名は半角空白だけが成功し、日本語、アラビア語、ヒンディー語、結合文字、絵文字、全角英数字、全角空白を含む名前がUTF-8を別encodingで解釈したような別名になった。

出力fileだけが非ASCIIの場合、exit 0でも期待pathにはfileがない。出力directoryが非ASCIIの場合は`Error opening output file`でexit 2になった。native separatorとforward slashで結果は同じだった。

したがって「Windows版pdftocairoは日本語PDFを読めない」ではない。今回の配布物では、Unicode入力pathは読めるがUnicode出力pathを正しい名前で作れない。

### Windows rsvg-convert

半角空白を含む入出力だけが成功し、調査したすべての非ASCII文字種で失敗した。

- 非ASCII入力fileではexit 0でも0 byteの期待出力が生成される場合がある
- 非ASCII出力fileではfileが生成されないか、文字を欠落・置換した別名になる
- native separatorとforward slashで結果は同じ

exit codeとfile存在だけでなく、出力sizeも検証する必要がある。

### Windows Draw.ioとqpdf

両toolとも、調査したすべての文字種、入力・出力位置、native separator、forward slashで成功した。現時点でASCII stagingを追加する根拠はない。

## 判断

外部コマンドへ一律にASCII stagingを追加しない。実測で失敗したWindowsのGhostscript、pdftocairo、rsvg-convertだけを対象候補とする。

separatorの`\\`を`/`へ変換するだけでは、今回確認したUnicode path問題は解決しない。Windowsの両separatorで結果が同一だったためである。

ASCII stagingを実装する場合は、外部コマンドの入力と出力をASCII名へmappingし、成功条件としてexit code、期待出力の存在、0 byteより大きいsizeを確認してからユーザー指定pathへ反映する。

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
