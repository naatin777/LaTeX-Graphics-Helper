# タスク: splitPdf.allPagesの失敗テストを追加する

## Status

Done

## 目的

複数PDFを安全に全ページ分割する主要挙動を、実装前のテストとして固定する。

## 完了条件

- 1つのPDFを1ページずつ分割するテストがある
- 複数PDFを分割するテストがある
- `${page}`が1始まりになることを確認する
- 既存出力があれば何も反映しないテストがある
- 出力パスが重複すれば何も反映しないテストがある
- キャンセル時に指定出力先へ反映しないテストがある
- 作業領域の元PDFコピーと完成PDFが残ることを確認する
- 未実装を理由としてテストが失敗することを確認する

## 変更可能なファイル

- `test/split_pdf_all_pages.test.ts`
- `docs/specs/split-pdf-all-pages.md`
- `docs/test-matrix.md`
- `docs/tasks/README.md`
- `docs/tasks/0018-add-split-pdf-all-pages-tests.md`
- `docs/tasks/0019-implement-split-pdf-all-pages.md`

## 対象外

- split処理の実装
- command UIの実装
- safe mode
- manual split

## 関連

- `docs/specs/file-operation-security.md`
- `docs/specs/conversion-progress-and-cancellation.md`
- `docs/specs/split-pdf-all-pages.md`

## 確認方法

- `pnpm run check:test`
- 未実装moduleが存在しないため失敗することを確認する

## 実施結果

- 1件・複数件のPDFを1ページずつ分割するテストを追加した
- 1始まりのページ番号と作業領域の保持を確認対象にした
- 既存出力、出力重複、キャンセル時に出力を反映しないテストを追加した
- `pnpm run check:test` は未実装の `src/operations/split_pdf_all_pages.ts` が存在しないため、想定どおり失敗した
