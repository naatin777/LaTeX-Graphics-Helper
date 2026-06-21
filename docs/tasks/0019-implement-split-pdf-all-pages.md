# タスク: splitPdf.allPagesを安全に実装する

## Status

Done

## 目的

選択された1件以上のPDFを、安全な作業領域で1ページずつ分割して出力する。

## 完了条件

- `outputPath.splitPdf`をページごとに展開する
- 複数PDFを処理できる
- `pdf-lib`で1ページごとのPDFを作成する
- `.latex-graphics-helper/split-pdf/`で処理する
- 全変換成功後に指定出力先へ一括反映する
- 既存出力と出力重複があれば全体停止する
- workspace境界を検証する
- withProgressとキャンセルに対応する
- 直前の変換取消に対応する
- `.vscode-test.mjs`を使用するテストを1回以上実行する

## 変更可能なファイル

- `src/operations/split_pdf_all_pages.ts`
- `src/commands/split_pdf_all_pages.ts`
- `src/extension.ts`
- `package.json`
- `package.nls.json`
- `package.nls.ja.json`
- `docs/specs/conversion-progress-and-cancellation.md`
- `docs/specs/split-pdf-all-pages.md`
- `docs/test-matrix.md`
- `docs/tasks/README.md`
- `docs/tasks/0019-implement-split-pdf-all-pages.md`
- `test/extension.test.ts`

## 対象外

- safe mode
- manual split
- Webview
- 新しいdependency

## 関連

- `docs/specs/split-pdf-all-pages.md`
- `docs/tasks/0018-add-split-pdf-all-pages-tests.md`

## 確認方法

- `pnpm run check:all`
- `pnpm run test`

## 実施結果

- `latex-graphics-helper.outputPath.splitPdf`を追加し、既定値を`${fileDirname}/${fileBasenameNoExtension}/${page}.pdf`にした
- `${page}`を1始まり・ゼロ埋めなしで展開する
- 1件以上のPDFを選択できるcommandを登録した
- 元PDFを`.latex-graphics-helper/split-pdf/`へコピーし、`pdf-lib`で1ページごとのPDFを作成する
- 全入力・全ページの生成後に、出力重複・既存出力・workspace境界を検証してから反映する
- 出力反映途中の失敗では、今回反映済みのページだけをロールバックする
- 通知領域のwithProgressとキャンセルに対応した
- 分割結果を直前の変換取消対象として記録する
- 新しいdependencyは追加していない
- `pnpm run check:all` 成功（既存を含むlint warningあり）
- `.vscode-test.mjs`を使用する`pnpm run test`成功（35 tests）
