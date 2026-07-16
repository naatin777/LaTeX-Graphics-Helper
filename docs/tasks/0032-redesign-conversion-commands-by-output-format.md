# タスク: 変換コマンドを出力形式基準へ再設計する

## Status

Done

## 目的

`SVGをPDFに変換`、`PNGをPDFに変換`、`PDFをPNGに変換`のような入力形式と出力形式の組み合わせごとの公開コマンドを廃止し、`PDFに変換`や`PNGに変換`のような出力形式基準の操作へ再設計する。

異なる形式のファイルを同時に選択し、同じ出力形式へまとめて変換できる仕様にする。

この変更は対応形式を増減するためではなく、現在対応している異なる入力形式を一度の操作で同じ出力形式へ変換できるようにするために行う。

## 決定済みの方針

- 公開する変換操作は入力形式ではなく出力形式を基準にする
- `PDFをPNGに変換`は`PNGに変換`へ置き換える
- `SVGをPDFに変換`、`PNGをPDFに変換`、`JPEGをPDFに変換`などは`PDFに変換`へ統合する
- 対応可能な異なる入力形式を同時に選択できるようにする
- 入力形式と出力形式の組み合わせごとにコンテキストメニューを増やさない
- サポートする入力形式と出力形式は現状から増減させない
- 現在サポートしていない変換の組み合わせを、この再設計を理由に追加しない
- PDF以外の出力も同じ考え方で、`PNGに変換`、`JPEGに変換`、`WebPに変換`、`AVIFに変換`、`SVGに変換`へ統合する
- 既存の変換実装を一度に作り直すことは、このタスクでは行わない

## 現行形式の扱い

現行の`package.json`で公開されている変換の対応関係を維持する。

- `PDFに変換`: Draw.io、PNG、JPEG、WebP、AVIF、SVG
- `PNGに変換`: Draw.io、PDF、JPEG、WebP、AVIF、SVG
- `JPEGに変換`: Draw.io、PDF、PNG、WebP、AVIF、SVG
- `WebPに変換`: Draw.io、PDF、PNG、JPEG、AVIF、SVG
- `AVIFに変換`: Draw.io、PDF、PNG、JPEG、WebP、SVG
- `SVGに変換`: Draw.io、PDF

同じ出力形式へ変換可能な入力だけを混在選択できるようにする。たとえば`PDFに変換`では、PNG、JPEG、WebP、AVIF、SVG、Draw.ioを同じ操作へ渡せる仕様を検討する。

## このタスクで決めること

- 出力形式基準で公開するコマンドIDと表示名
- 混在する複数ファイルを選択した場合の処理単位
- 対応していない入力形式が含まれる場合の全体停止条件
- PDFの複数ページを画像へ変換する場合の出力規則
- `outputPath.convertPdfToPng`など既存設定の移行方法
- 既存コマンドIDを削除するか、互換用の非公開aliasとして残すか
- コンテキストメニューとCommand Paletteの構成
- Safe Mode、進捗表示、キャンセル、Undoを適用する単位
- 変換前後の画像サイズとPDFページサイズの対応規則
- PDFから画像へ変換する場合のDPIと出力pixel数の規則

## テスト方針

テストではファイルが生成されたことだけでなく、変換結果のサイズも確認する。

- 画像出力はmetadataから幅と高さを取得して期待値と比較する
- PDF出力はページ数と各ページの幅・高さを取得して期待値と比較する
- 画像からPDFへ変換する場合は、画像の幅・高さとPDFページサイズの対応を確認する
- PDFから画像へ変換する場合は、元ページサイズ、設定DPI、出力pixel数の関係を確認する
- 複数形式を同時に変換した場合も、各出力のサイズを個別に確認する
- 縦横比を維持する仕様では、幅・高さの片方だけでなく縦横比も確認する
- 浮動小数のPDFページサイズは、仕様で決めた許容誤差を使って比較する

サイズの期待値は実装から逆算せず、テスト追加前に仕様書へ記録する。

## 決定した未決事項

- 複数画像を`PDFに変換`した場合、画像ごとに別のPDFを作る
- 同じ拡張子のファイルを同じ出力形式へ変換しようとした場合は、非対応入力として全体停止する
- 出力形式基準への移行は、まず`PDFに変換`から段階的に行う

詳細は`docs/specs/internal/output-format-conversion.md`へ記録した。

## 完了条件

- 出力形式基準のコマンド仕様が`docs/specs/`に記録されている
- 各コマンドの対応入力形式が決まっている
- 現行の対応形式が増減していないことを確認できる対応表がある
- 混在形式の複数選択時の結果が決まっている
- 画像サイズ、PDFページサイズ、DPI、許容誤差の仕様が決まっている
- 既存コマンドと設定の移行方針が決まっている
- Safe Mode、進捗表示、キャンセル、Undoとの関係が決まっている
- テスト追加タスクと実装タスクへ分割されている

## 変更可能なファイル

- 出力形式基準の変換仕様を記録する新規`docs/specs/`
- 必要な新規`docs/adr/`
- `docs/tasks/README.md`
- `docs/tasks/0032-redesign-conversion-commands-by-output-format.md`
- この仕様から分割する新規タスクファイル

## 対象外

- `package.json`の変更
- `src/`の変更
- test fileの変更
- 既存コマンドの削除
- 変換処理の実装
- dependency追加

## 関連

- `docs/specs/internal/safe-mode.md`
- `docs/specs/internal/conversion-progress-and-cancellation.md`
- `docs/specs/internal/output-format-conversion.md`
- `docs/adr/0009-use-output-format-conversion-commands.md`
- `docs/tasks/0028-add-png-safe-mode-tests.md`
- `docs/tasks/0029-integrate-png-conversion-with-safe-mode.md`
- `docs/tasks/0034-add-convert-to-pdf-output-format-tests.md`
- `docs/tasks/0035-implement-convert-to-pdf-output-format-command.md`

## 確認方法

- 現行の`package.json`にある変換コマンド、メニュー、設定との対応表を作る
- 未決事項についてユーザーの判断を確認する
- `git diff --check`
