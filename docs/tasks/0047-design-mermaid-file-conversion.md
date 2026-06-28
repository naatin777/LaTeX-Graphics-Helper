# タスク: Mermaidファイル変換の仕様を決める

## Status

Done

## 目的

`.mmd`ファイルをExplorerの右クリックcontext menuから、PDF・PNG・JPEG・WebP・AVIF・SVGなどへ変換できるようにするための仕様を決める。

このタスクでは実装せず、どの出力形式に対応するか、どの変換エンジンを使うか、既存の出力形式基準コマンドへどう統合するかを決める。

## 背景

既存の変換コマンドは、入力形式ごとのコマンドではなく、`PDF`、`PNG`、`SVG`などの出力形式基準で整理している。

Mermaidも`.mmd`専用の独立メニューにするのではなく、可能なら既存の`変換`サブメニュー配下で、出力形式を選ぶ形に揃える。

例:

```text
変換
├ PDF
├ PNG
└ SVG
```

## 現時点の方針

- Mermaid入力は`.mmd`と`.mermaid`を対象にする。
- 変換エンジンは`@mermaid-js/mermaid-cli`を使う。
- `@mermaid-js/mermaid-cli`はdependencyとして追加する。
- 初期実装では、dependencyとしてinstallされた`mmdc` CLIを呼び出す。
- `@mermaid-js/mermaid-cli`のNode.js APIは初期実装では使わない。
- 初期実装ではMermaid CLIのデフォルト設定を使う。
- 初期実装では、まず`convertToSvg`でMermaidをSVGへ変換する。
- Mermaid CLIが直接出力できる形式は、なるべく直接出力する。
- SVG、PNG、PDFはMermaid CLIから直接出力する方針にする。
- JPEG、WebP、AVIFはMermaid CLIの直接出力対象ではないため、生成したSVGまたはPNGを既存の変換経路へ渡す。
- context menuは、他の画像ファイルなどと同じように既存の`変換`サブメニュー配下へ統合する。
- Safe Mode、Undo、progress、cancellationは、他の画像ファイルなどの既存変換と同じ扱いにする。
- Mermaid専用の公開コマンドは作らず、出力形式基準コマンドへ入力形式として追加する。

理由:

- MermaidはSVGへ出力できれば、まず壊れていないベクター出力を確認できる。
- SVG、PNG、PDFはMermaid CLIが直接出力できるため、不要な中間変換を避けられる。
- JPEG、WebP、AVIFは直接出力できないため、既存の変換経路を再利用する。
- `@mermaid-js/mermaid-cli`を使うことで、Mermaid構文の解釈を自前実装しないで済む。
- Mermaid CLIをdependencyとして持つことで、ユーザーに別途CLI installを求めないで済む。
- 専用コマンドを増やすと、出力形式基準へ整理した方針とずれる。
- Mermaid CLI README上でNode.js APIはsemver保証対象外とされているため、初期実装ではCLI呼び出しを優先する。

## 既存実装との依存関係

現時点では、出力形式基準コマンドのうち実装済みなのは`latex-graphics-helper.convertToPdf`だけである。

そのため、Mermaid変換は以下の依存関係を持つ。

- Mermaid → PDF: 既存の`convertToPdf`へMermaid入力を追加すれば実装できる
- Mermaid → SVG: `convertToSvg`の実装が必要
- Mermaid → PNG: `convertToPng`の実装が必要
- Mermaid → JPEG: `convertToJpeg`の実装が必要
- Mermaid → WebP: `convertToWebp`の実装が必要
- Mermaid → AVIF: `convertToAvif`の実装が必要

したがって、初期実装では`convertToSvg`を先に実装して、Mermaid → SVGを扱う。

専用の`convertMermaidToSvg`公開コマンドは作らない。

## テーマ・見た目の扱い

初期実装では、テーマや見た目の設定を拡張機能の設定項目として公開しない。

理由:

- まずは`.mmd`/`.mermaid`を安定してSVGへ変換できることを優先する。
- Mermaidはデフォルト設定だけでも変換できる。
- テーマ、背景色、フォント、CSS、config fileまで同時に扱うと、初期実装とテスト範囲が広がる。

将来の拡張候補:

- Mermaid theme: `default`、`neutral`、`dark`、`forest`、`base`など
- Mermaid look: `classic`、`handDrawn`、`neo`
- background color
- font family / font size
- `themeVariables`
- `themeCSS`
- Mermaid config file

`themeVariables`による細かいカスタムは、`base` themeを前提にする必要があるため、初期実装では扱わない。

設定項目が少ない範囲に収まるなら、将来的に`settings.json`から変更できるようにしてよい。

候補:

- `latex-graphics-helper.convertMermaid.theme`
- `latex-graphics-helper.convertMermaid.look`
- `latex-graphics-helper.convertMermaid.backgroundColor`

ただし、初期実装で設定化するかは別途決める。まずはデフォルト設定で変換できる状態を優先する。

## 完了条件

- `.mmd`入力で対応する出力形式を決める
- Mermaid変換に使うエンジンを決める
- 外部依存を追加する場合は、理由と代替案を書く
- 既存の`docs/specs/output-format-conversion.md`へ反映する内容を決める
- テストすべき範囲を決める
- 実装タスクとテスト追加タスクに分割する

## 変更可能なファイル

- `docs/tasks/0047-design-mermaid-file-conversion.md`
- `docs/tasks/README.md`
- `docs/specs/output-format-conversion.md`
- `docs/research/`
- 必要なら `docs/adr/`

## 対象外

- `.mmd`変換の実装
- dependency追加
- package.jsonのcontext menu変更
- READMEへの機能説明追加

## 検討事項

- PDF出力時のページサイズをどう決めるか
- SVG/PNG/JPEG/WebP/AVIF出力時のサイズ確認をどうテストするか
- Mermaid → SVGを初期実装範囲にする

## テスト方針案

- Mermaid source fixtureを用意する。
- SVG出力は、ファイルが存在することだけでなく、`<svg`を含むこと、Mermaid由来のテキストが含まれることを確認する。
- PNG/JPEG/WebP/AVIF出力は、実画像として読めることと、幅・高さが0より大きいことを確認する。
- PDF出力は、1ページ以上あることと、ページサイズが0より大きいことを確認する。
- 出力ファイル名が既存のoutputPath設定通りになることを確認する。
- 画像比較テストは、初期実装では必須にしない。
- 画像比較を導入する場合は、Mermaid CLI / Chromium / font renderingの差でOSごとに揺れやすいため、厳密なpixel一致ではなく、別タスクで許容差つき比較を検討する。

画像変換結果の確認は、初期実装では「壊れていないこと」「サイズが明らかにおかしくないこと」を優先する。

## 出力ファイル名

Mermaid変換も、他の画像ファイルなどと同じように既存のoutputPath設定で扱う。

初期案:

- `.mmd` / `.mermaid`からSVG: `outputPath.convertMermaidToSvg`
- `.mmd` / `.mermaid`からPNG: `outputPath.convertMermaidToPng`
- `.mmd` / `.mermaid`からJPEG: `outputPath.convertMermaidToJpeg`
- `.mmd` / `.mermaid`からWebP: `outputPath.convertMermaidToWebp`
- `.mmd` / `.mermaid`からAVIF: `outputPath.convertMermaidToAvif`
- `.mmd` / `.mermaid`からPDF: `outputPath.convertMermaidToPdf`

既定値は、既存変換と同じ考え方で、入力ファイルと同じディレクトリに拡張子だけを変えて出力する。

例:

```text
${fileDirname}/${fileBasenameNoExtension}.svg
${fileDirname}/${fileBasenameNoExtension}.png
${fileDirname}/${fileBasenameNoExtension}.jpeg
${fileDirname}/${fileBasenameNoExtension}.webp
${fileDirname}/${fileBasenameNoExtension}.avif
${fileDirname}/${fileBasenameNoExtension}.pdf
```

将来、出力形式基準の`outputPath.convertToSvg`などへ統合する場合は、既存の出力形式基準設定移行方針に合わせる。

## 分割案

1. Mermaid変換仕様を`docs/specs/output-format-conversion.md`へ反映する
2. `@mermaid-js/mermaid-cli`をdependencyとして追加する
3. Mermaid → SVGの失敗テストを追加する
4. 選んだ出力形式の失敗テストを追加する
5. 選んだ出力形式の最小実装を追加する
6. `.mermaid`も同じ変換対象として扱う
7. SVG経由で残りのPDF/PNG/JPEG/WebP/AVIF/SVGへ変換できるように拡張する

## 関連

- `docs/specs/output-format-conversion.md`
- `docs/specs/conversion-progress-and-cancellation.md`
- `docs/specs/safe-mode.md`
- `docs/tasks/0032-redesign-conversion-commands-by-output-format.md`
- `docs/tasks/0046-implement-convert-to-pdf-svg.md`

## 確認方法

- 仕様と分割方針をユーザーが確認する
