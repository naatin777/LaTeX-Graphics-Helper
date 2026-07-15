# タスク: Draw.ioの複雑なpathを使う実fixtureテストを追加する

## Status

Done

## 目的

Draw.ioのページ名、入力フォルダ名、入力ファイル名、出力フォルダ名、出力ファイル名に空白・多言語文字・絵文字・全角文字が混在していても、Draw.ioからPDFへの変換経路がpathを壊さずに完了することをテストで固定する。

## 完了条件

- 実際のDraw.io fixtureをテスト環境へコピーして使う
- ページ名に先頭全角空白・日本語・絵文字を含むfixtureを使う
- 入力フォルダ名・入力ファイル名・出力フォルダ名・出力ファイル名に複雑な文字と空白を含める
- Draw.io runnerへ渡す入力pathと中間PDF出力pathが壊れていないことを確認する
- 変換後PDFが読み取り可能で、fixtureと同じ3ページであることを確認する
- テスト後も入力fixtureが変更されないことを確認する

## 変更可能なファイル

- `test/convert_to_pdf_drawio_path.test.ts`
- `docs/tasks/0182-add-drawio-complex-path-test.md`
- `docs/tasks/README.md`

## 対象外

- Draw.io Desktop本体のCIインストール
- Draw.io CLI自体の仕様調査
- Draw.ioの変換処理やpath staging実装の変更
- 新しいfixtureの生成

## 確認方法

- `pnpm run check`
- `pnpm run test:vscode`
- `git diff --check`
