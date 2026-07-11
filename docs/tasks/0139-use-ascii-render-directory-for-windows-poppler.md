# タスク: Windows Poppler用にASCIIの画像比較ディレクトリを使う

## Status

Done

## 目的

crop画像比較テストで、Unicode入力パスの検証を維持しながら、Windows版PopplerがPNGを書き出せるASCII名の一時ディレクトリを使う。

## 背景

設定済み`pdftocairo.exe`を使う修正後、Windows CIでは実行ファイルの起動とUnicodeパスの入力PDF読み込みに成功した。一方、日本語・絵文字を含む一時workspace内のPNG出力先に対して`Error opening output file`になった。

画像比較用PNGはextensionの製品出力ではなくテスト内部artifactであるため、入力PDFとcrop出力PDFはUnicode workspace内に維持し、rasterize結果だけをOSの一時ディレクトリに作る。

## 完了条件

- 入力fixtureとcrop出力PDFはUnicodeを含む一時workspace内で扱う
- `pdftocairo`のPNG出力先だけをASCII名の独立一時ディレクトリにする
- 一時renderディレクトリをテスト終了時に削除する
- 画像比較の期待値や許容値を変更しない
- PR #308のWindows VS Codeテストが成功する

## 変更可能なファイル

- `test/crop_pdf_configure_operation.test.ts`
- `docs/tasks/README.md`
- `docs/tasks/0139-use-ascii-render-directory-for-windows-poppler.md`

## 対象外

- fixtureのファイル名変更
- Unicode pathテストの削除
- CIのPATH・環境変数変更
- 画像比較の緩和
- extension実装の変更

## 確認方法

- `CI=true pnpm run check:all`
- `CI=true pnpm run test:vscode`
- PR #308のWindows VS Codeテスト

## 確認結果

- Windows CIで固定fixtureの全ページcrop・選択ページcrop・Unicode outputPathテストが成功した
- 同じrunで発生したMermaidからWebPへのPuppeteer `EBUSY`は、失敗jobの再実行では再現せずWindows VS Codeテスト全体が成功した
