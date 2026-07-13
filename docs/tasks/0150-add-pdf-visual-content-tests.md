# タスク: PDF描画内容比較テストを追加する

## Status

In Progress

## 目的

PDFのページ数・MediaBox・CropBox・ファイルサイズだけでは検出できない、描画内容の欠落や座標ずれを、固定fixtureから生成した期待画像と実際の出力画像の比較で検出する。

## テスト方針

- 固定fixtureを一時workspaceへコピーし、実ファイルの読み込み経路を通す
- `latex-graphics-helper.execPath.pdftocairo`で入力PDFと出力PDFを同じ解像度（初期値144 DPI）でPNGへ描画する
- PDFバイナリの完全一致ではなく、次を組み合わせて比較する
  - PNGの幅・高さ
  - 許容値を設けたpixel差分率
  - 平均channel差分
  - 内容が1pxずれた場合に検出できる位置比較
- 既存のcrop比較で使っている「入力を描画して期待領域を作る」考え方を、splitとmergeにも適用する
- 画像比較の許容値はanti-alias差を考慮するが、座標ずれを通してしまうほど広げない

## テスト追加内容

### split

- 複数ページの固定fixtureを分割する
- 分割された各PDFを描画し、元PDFの対応ページと比較する
- ページ番号と描画内容の対応がずれた場合に失敗することを確認する

### merge

- 複数の固定fixtureを選択順に結合する
- 結合後の各ページを描画し、入力PDFを選択順に並べた期待ページと比較する
- ページ順が入れ替わった場合に失敗することを確認する

## 変更対象

- `test/helpers/` (PDF描画・画像比較helper)
- `test/split_pdf_all_pages.test.ts`
- `test/merge_pdf_command.test.ts`
- `docs/test-matrix.md`
- `docs/tasks/README.md`
- `docs/tasks/0150-add-pdf-visual-content-tests.md`

## 対象外

- PDF処理本体の実装変更
- cropPdf.configureの既存描画比較の置き換え
- PDF.jsやPlaywrightの導入・変更
- PDFバイナリ完全一致の検証
- JPEG/WebP/AVIFなど非可逆画像変換の厳密なpixel完全一致
- CI artifact保存のworkflow変更

## 完了条件

- splitの各出力ページについて、元ページとの描画内容比較がある
- mergeの各出力ページについて、入力順との描画内容比較がある
- 比較helperがサイズだけでなくpixel差分と位置ずれを検証する
- 固定fixtureを一時workspaceへコピーする
- `src/`に変更がない
- `docs/test-matrix.md`に検証範囲を反映する

## 関連

- [テスト方針](../test-policy.md)
- [0123: cropPdf.configureの操作テストを追加する](0123-add-crop-pdf-configure-operation-tests.md)
- [0126: 実fixtureと画像比較を使うテスト方針を決める](0126-design-real-fixture-and-visual-testing.md)

## 確認方法

- `CI=true pnpm run check:all`
- `CI=true pnpm run test`
- splitとmergeの描画内容比較テストを対象指定して実行する
